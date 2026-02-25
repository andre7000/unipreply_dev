import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

export default function Landing() {
  const router = useRouter();
  const { currentUser, loading, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleGetStarted = () => {
    if (currentUser) {
      router.push("/dashboard");
    } else {
      router.push("/signup");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Unipreply | Common Data Sets & Scholarships</title>
        <meta
          name="description"
          content="Research colleges, explore Common Data Sets, and discover scholarships. Built for parents and students."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b">
          <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-1 font-semibold text-lg"
            >
              <GraduationCap className="size-6 text-primary" />
              Unipreply
            </Link>
            <div className="flex items-center gap-4">
              {currentUser ? (
                <>
                  <span className="text-sm text-muted-foreground font-mono">
                    {currentUser.uid.substring(0, 8)}...
                  </span>
                  <Link href="/dashboard">
                    <Button variant="ghost">Dashboard</Button>
                  </Link>
                  <Button variant="outline" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                  <Button onClick={() => router.push("/dashboard")}>
                    Go to App
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/signin">
                    <Button variant="ghost">Sign In</Button>
                  </Link>
                  <Link href="/signup">
                    <Button>Sign Up</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>

        <main style={{ paddingTop: "3rem", paddingBottom: ".5rem" }}>
          <section
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              maxWidth: "56rem",
              margin: "0 auto",
              padding: "0 1rem",
            }}
          >
            <h1
              style={{
                fontSize: "clamp(1.875rem, 5vw, 1rem)",
                fontWeight: 700,
                marginBottom: "1.5rem",
                textAlign: "center",
              }}
            >
              Research Colleges with Confidence
            </h1>
            <p
              style={{
                fontSize: "1.25rem",
                maxWidth: "42rem",
                margin: "0 auto 2.5rem",
                textAlign: "center",
                color: "var(--muted-foreground)",
              }}
            >
              Explore Common Data Sets from hundreds of colleges, compare
              admission stats, costs, and financial aid—then discover
              scholarships that match your profile.
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Button
                size="lg"
                style={{ padding: "0.75rem 2rem" }}
                className="text-lg"
                onClick={handleGetStarted}
              >
                {currentUser ? "Go to Dashboard" : "Get Started"}
              </Button>
            </div>
          </section>
        </main>

        <section style={{ paddingTop: "2rem", paddingBottom: "6rem" }}>
          <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <GraduationCap className="size-6" />
              </div>
              <h2 className="font-semibold text-lg mb-2">Common Data Sets</h2>
              <p className="text-muted-foreground">
                Access standardized college data—admission rates, demographics,
                costs, and outcomes—in one place.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <GraduationCap className="size-6" />
              </div>
              <h2 className="font-semibold text-lg mb-2">Scholarship Search</h2>
              <p className="text-muted-foreground">
                Search and filter scholarships by eligibility, deadline, and
                amount. Track applications in one dashboard.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <GraduationCap className="size-6" />
              </div>
              <h2 className="font-semibold text-lg mb-2">For Families</h2>
              <p className="text-muted-foreground">
                Parent accounts can manage multiple student profiles and
                collaborate on Unipreply together.
              </p>
            </div>
          </div>
        </section>

        <footer className="border-t py-8">
          <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Unipreply. All rights reserved.
          </div>
        </footer>
      </div>
    </>
  );
}
