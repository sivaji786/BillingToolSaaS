import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';

export function SAusage() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Usage Analytics</CardTitle>
                    <CardDescription>Monitor platform resource usage and performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-24">
                    <div className="text-center">
                        <p className="text-2xl font-semibold text-muted-foreground">Coming Soon</p>
                        <p className="text-sm text-muted-foreground mt-2">Usage analytics and metrics will be available soon</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
