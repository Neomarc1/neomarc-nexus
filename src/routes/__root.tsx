import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../integrations/supabase/client";

import appCss from "../styles.css?url";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const [reportState, setReportState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  useEffect(() => {
  }, [error]);

  async function report() {
    setReportState("sending");
    try {
      const { submitErrorReport, safeErrorSummary } = await import("../lib/report-error");
      const res = await submitErrorReport({
        pagePath: window.location.pathname,
        actionAttempted: "Loading this page",
        errorSummary: safeErrorSummary(error),
      });
      setReportState(res.ok ? "sent" : "failed");
    } catch {
      setReportState("failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Something went wrong.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This screen could not be loaded. You can try again, or let the NEOMARC team know.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <button
            onClick={report}
            disabled={reportState === "sending" || reportState === "sent"}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
          >
            {reportState === "sent"
              ? "Problem reported"
              : reportState === "sending"
                ? "Reporting…"
                : "Report problem"}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
        {reportState === "failed" ? (
          <p className="mt-3 text-xs text-muted-foreground">
            The report could not be sent. Please tell your NEOMARC administrator.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async () => {
    const { data } = await supabase
      .from("company_profile")
      .select("site_name, site_abbreviation, site_description, logo_url, favicon_url")
      .eq("id", 1)
      .maybeSingle();
      
    return {
      branding: {
        siteName: data?.site_name || "NEOMARC REALTY",
        siteAbbreviation: data?.site_abbreviation || "N",
        siteDescription: data?.site_description || "NEOMARC Digital Operating System",
        logoUrl: data?.logo_url || null,
        faviconUrl: data?.favicon_url || "/favicon.ico",
      }
    };
  },
  head: ({ loaderData }) => {
    const branding = loaderData?.branding || {
      siteName: "NEOMARC REALTY",
      siteDescription: "NEOMARC Digital Operating System",
      faviconUrl: "/favicon.ico",
    };
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: branding.siteName },
        { name: "description", content: branding.siteDescription },
        { name: "author", content: branding.siteName },
        { property: "og:title", content: branding.siteName },
        { property: "og:description", content: branding.siteDescription },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: `@${branding.siteName.replace(/\s+/g, '')}` },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: branding.faviconUrl, type: "image/x-icon" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@400;500;600;700;800&display=swap" },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: (props) => (
    <ErrorComponent
      error={props.error instanceof Error ? props.error : new Error(String(props.error))}
      reset={props.reset}
    />
  ),
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
