import { useState } from 'react';
import { adminAuthService } from '../../../services/adminApi';
import { useAdminStore } from '../../../stores/adminStore';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Alert, AlertDescription } from '../../ui/alert';
import { Loader2, Lock, Mail, Shield, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { TicketingWidget } from '../../TicketingWidget';
import { getTicketingApiKey, getErrorMessage } from '../../../utils/config';

interface SALoginProps {
    onLoginSuccess: () => void;
}

export function SALogin({ onLoginSuccess }: SALoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { setAuth } = useAdminStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { user, token } = await adminAuthService.login(email, password);
            setAuth(user, token);
            toast.success('Login successful', {
                description: `Welcome back, ${user.name}!`,
            });
            onLoginSuccess();
        } catch (err: unknown) {
            const errorMessage = getErrorMessage(err, 'Invalid email or password');
            setError(errorMessage);
            toast.error('Login failed', {
                description: errorMessage,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f6ff] via-white to-[#dbe8f7] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
            {/* Home link — top-left */}
            <div className="absolute top-4 left-4">
                <a
                    href="#/"
                    onClick={() => { window.location.hash = '#/'; }}
                    className="inline-flex items-center gap-1.5 text-heading-3 text-gray-500 dark:text-gray-400 hover:text-[#f08a3c] dark:hover:text-[#3d5a80] transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                </a>
            </div>

            <div className="w-full max-w-md">
                {/* Logo and Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#f08a3c] mb-4 shadow-lg">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-heading-1 font-medium text-gray-900 dark:text-white mb-2">
                        SaaS Admin Portal
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage your platform with ease
                    </p>
                </div>

                {/* Login Card */}
                <Card className="shadow-xl">
                    <CardHeader>
                        <CardTitle>Admin Login</CardTitle>
                        <CardDescription>
                            Enter your credentials to access the admin dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="admin@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </form>


                    </CardContent>
                </Card>

                {/* Footer */}
                <p className="text-center text-body text-gray-600 dark:text-gray-400 mt-6">
                    © 2026 SaaS Admin Portal. All rights reserved.
                </p>
            </div>
            <TicketingWidget apiKey={getTicketingApiKey()} />
        </div>
    );
}
