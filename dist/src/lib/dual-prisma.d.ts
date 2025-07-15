export let mainPrisma: PrismaClient<{
    datasources: {
        db: {
            url: string | undefined;
        };
    };
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
export let gygPrisma: PrismaClient<{
    datasources: {
        db: {
            url: string | undefined;
        };
    };
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
export function getPrismaClient(databaseType?: string): PrismaClient<{
    datasources: {
        db: {
            url: string | undefined;
        };
    };
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
export function testBothDatabases(): Promise<{
    main: {
        connected: boolean;
        error: null;
    };
    gyg: {
        connected: boolean;
        error: null;
    };
}>;
import { PrismaClient } from ".prisma/client";
//# sourceMappingURL=dual-prisma.d.ts.map