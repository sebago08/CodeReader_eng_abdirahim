import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // In dev mode, just redirect to the login endpoint
        window.location.href = "/api/login";
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <div className="flex items-center justify-center mb-4">
                        <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center">
                            <i className="fas fa-hard-hat text-primary-foreground text-xl"></i>
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center">Sign in to RoadTracker</CardTitle>
                    <p className="text-center text-muted-foreground">
                        Enter your email to continue
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="dev@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <i className="fas fa-spinner fa-spin mr-2"></i>
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-sign-in-alt mr-2"></i>
                                    Sign in
                                </>
                            )}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground mt-4">
                            Development mode: Any email will work
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
