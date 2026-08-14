import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

async function beginOAuth(): Promise<void> {
  const resp = await fetch("/api/oauth/begin", { credentials: "include" });
  if (!resp.ok) {
    throw new Error(`OAuth begin failed (${resp.status})`);
  }
  const data = (await resp.json()) as { url: string };
  window.location.href = data.url;
}

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Welcome</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              beginOAuth().catch((error) => {
                console.error(error);
              });
            }}
          >
            Sign in with Kimi
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
