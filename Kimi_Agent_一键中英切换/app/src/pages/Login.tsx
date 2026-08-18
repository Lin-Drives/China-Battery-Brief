import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CBBButton from "@/components/Buttons";
import { useLang } from "@/i18n/lang";
import RubberStamp from "@/components/RubberStamp";

/**
 * Reserved auth placeholder. The demo runs without login (see plan.md), so
 * this page explains the state instead of starting a Kimi OAuth flow. It will
 * become the email+password sign-in form once auth ships.
 */
export default function Login() {
  const { t } = useLang();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-mono text-[12px] uppercase tracking-[0.16em]">
            {t("login.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 text-center">
          <RubberStamp color="var(--signal)">{t("login.comingSoon")}</RubberStamp>
          <p className="font-mono text-[13px] leading-[1.7] text-muted-foreground">
            {t("login.body")}
          </p>
          <CBBButton variant="paper" to="/">
            {t("login.backHome")}
          </CBBButton>
        </CardContent>
      </Card>
    </div>
  );
}
