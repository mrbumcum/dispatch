import { useState } from "react";
import { supabase } from "@/supabase-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        if (!email || !password) {
            setError("Please enter email and password.");
            return;
        }
        if (isSignUp && (!firstName || !lastName)) {
            setError("Please enter first and last name.");
            return;
        }
        setLoading(true);
        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            first_name: firstName,
                            last_name: lastName,
                        },
                    },
                });
                if (error) throw error;
                // Depending on your Supabase settings, signUp may require email verification
                setMessage("Sign up successful. Check your email if verification is required.");
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                setMessage("Signed in successfully.");
                // Home.tsx listens to auth state changes and will render the Home page
            }
        } catch (err: any) {
            setError(err?.message ?? "Authentication failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>{isSignUp ? "Create an account" : "Sign in"}</CardTitle>
                    <CardDescription>
                        {isSignUp
                            ? "Use email and password to sign up"
                            : "Enter your credentials to continue"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignUp && (
                            <>
                                <div className="space-y-2">
                                    <label htmlFor="firstName" className="text-sm font-medium">
                                        First Name
                                    </label>
                                    <Input
                                        id="firstName"
                                        type="text"
                                        placeholder="John"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        disabled={loading}
                                        autoComplete="given-name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="lastName" className="text-sm font-medium">
                                        Last Name
                                    </label>
                                    <Input
                                        id="lastName"
                                        type="text"
                                        placeholder="Doe"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        disabled={loading}
                                        autoComplete="family-name"
                                    />
                                </div>
                            </>
                        )}
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                                Email
                            </label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                autoComplete="email"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium">
                                Password
                            </label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                autoComplete={isSignUp ? "new-password" : "current-password"}
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}
                        {message && (
                            <p className="text-sm text-green-600">{message}</p>
                        )}

                        <div className="flex items-center gap-2">
                            <Button type="submit" disabled={loading} className="flex-1">
                                {loading ? (isSignUp ? "Signing up…" : "Signing in…") : (isSignUp ? "Sign up" : "Sign in")}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsSignUp((v) => !v)}
                                disabled={loading}
                            >
                                {isSignUp ? "Have an account? Sign in" : "New here? Sign up"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default Auth;