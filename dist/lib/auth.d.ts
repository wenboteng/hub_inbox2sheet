import { NextRequest, NextResponse } from 'next/server';
export interface AuthenticatedUser {
    userId: string;
    email: string;
    subscriptionTier: string;
    city?: string;
    country?: string;
}
export declare function authenticateUser(request: NextRequest): Promise<AuthenticatedUser | null>;
export declare function requireAuth(handler: (req: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>): (request: NextRequest) => Promise<NextResponse<unknown>>;
export declare function requireTier(minTier: string): (handler: (req: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>) => (request: NextRequest) => Promise<NextResponse<unknown>>;
export declare function checkAiUsageLimit(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
}>;
export declare function incrementAiUsage(userId: string): Promise<void>;
//# sourceMappingURL=auth.d.ts.map