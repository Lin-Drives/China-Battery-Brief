#!/usr/bin/env python3
"""China Battery Brief — release preflight.

`plan`  — compare local seed content with the live DB (number/title/markdown hash)
          so the deploy script can print what a release would change.
`stage` — build a temporary content directory containing only the new issues, used by
          DEPLOY_ONLY_NEW=1 so old-issue edits stay off this release.
"""

import argparse
import hashlib
import json
import pathlib


def md5(path: pathlib.Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()


def read_json(path) -> object:
    return json.loads(pathlib.Path(path).read_text(encoding="utf-8"))


def db_rows(path: str) -> dict:
    rows = {}
    for line in pathlib.Path(path).read_text(encoding="utf-8").splitlines():
        parts = line.split("\t")
        if len(parts) < 5:
            continue
        num, slug, title, h_en, h_zh = parts[:5]
        rows[int(num)] = {
            "slug": slug,
            "title": title,
            "md5_en": "" if h_en in ("", "NULL") else h_en,
            "md5_zh": "" if h_zh in ("", "NULL") else h_zh,
        }
    return rows


def cmd_plan(args) -> int:
    app = pathlib.Path(args.app_dir)
    en = read_json(app / "db/seed-content/issues.json")
    db = db_rows(args.db)
    plan = {"new": [], "title": [], "body": [], "missing": []}
    seen = set()

    for it in en:
        n = it["number"]
        seen.add(n)
        f_en = app / "db/seed-content" / f"issue-{n:03d}.md"
        f_zh = app / "db/seed-content-zh" / f"issue-{n:03d}-zh.md"
        if not f_en.exists():
            plan["missing"].append({"number": n, "file": str(f_en)})
            continue
        h_en = md5(f_en)
        h_zh = md5(f_zh) if f_zh.exists() else ""
        row = db.get(n)
        if row is None:
            plan["new"].append({"number": n, "slug": it["slug"], "title": it["title"]})
            continue
        if it["title"] != row["title"]:
            plan["title"].append({"number": n, "old": row["title"], "new": it["title"]})
        if h_en != row["md5_en"] or h_zh != row["md5_zh"]:
            plan["body"].append({"number": n})

    gone = [n for n in db if n not in seen]
    pathlib.Path(args.out).write_text(
        json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    total = len(plan["new"]) + len(plan["title"]) + len(plan["body"])
    if total == 0 and not plan["missing"] and not gone:
        print("  没有变更：本地 seed 内容与生产库一致。")
        return 2

    print(
        f"  新增 {len(plan['new'])} 期 · 标题改动 {len(plan['title'])} 期 · "
        f"正文/元数据改动 {len(plan['body'])} 期"
    )
    for x in plan["new"][:10]:
        print(f"    [新增] No.{x['number']:03d}  {x['title']}")
    for x in plan["title"][:10]:
        print(f"    [标题] No.{x['number']:03d}  {x['old']}  →  {x['new']}")
    if plan["body"]:
        nums = ", ".join(f"No.{x['number']:03d}" for x in plan["body"][:12])
        more = "" if len(plan["body"]) <= 12 else f" 等 {len(plan['body'])} 期"
        print(f"    [正文] {nums}{more}")
    for x in plan["missing"][:5]:
        print(f"    [缺文件] No.{x['number']:03d}  {x['file']}")
    if gone:
        print(
            "    [库中多出] "
            + ", ".join(f"No.{n:03d}" for n in sorted(gone))
            + "（本地已无，不会自动删除）"
        )
    return 0


def cmd_stage(args) -> int:
    app = pathlib.Path(args.app_dir)
    plan = read_json(args.plan)
    new = {x["number"] for x in plan["new"]}
    if not new:
        print("  没有新期，无需暂存。")
        return 2

    en = read_json(app / "db/seed-content/issues.json")
    zh = read_json(app / "db/seed-content-zh/issues-zh.json")
    keep = [x for x in en if x["number"] in new]
    slugs = {x["slug"] for x in keep}

    stage = pathlib.Path(args.stage)
    (stage / "seed-content").mkdir(parents=True, exist_ok=True)
    (stage / "seed-content-zh").mkdir(parents=True, exist_ok=True)
    (stage / "seed-content" / "issues.json").write_text(
        json.dumps(keep, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    keep_zh = [x for x in zh if x.get("slug") in slugs]
    (stage / "seed-content-zh" / "issues-zh.json").write_text(
        json.dumps(keep_zh, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    for n in sorted(new):
        src_en = app / "db/seed-content" / f"issue-{n:03d}.md"
        (stage / "seed-content" / src_en.name).write_bytes(src_en.read_bytes())
        src_zh = app / "db/seed-content-zh" / f"issue-{n:03d}-zh.md"
        (stage / "seed-content-zh" / src_zh.name).write_bytes(src_zh.read_bytes())

    print("  暂存 " + ", ".join(f"No.{n:03d}" for n in sorted(new)))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("plan")
    p.add_argument("--app-dir", required=True)
    p.add_argument("--db", required=True, help="TSV: number, slug, title, md5(content), md5(contentZh)")
    p.add_argument("--out", required=True)
    p.set_defaults(func=cmd_plan)

    s = sub.add_parser("stage")
    s.add_argument("--app-dir", required=True)
    s.add_argument("--plan", required=True)
    s.add_argument("--stage", required=True)
    s.set_defaults(func=cmd_stage)

    args = ap.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
