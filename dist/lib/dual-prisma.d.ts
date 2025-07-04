import { PrismaClient } from '@prisma/client';
declare const mainPrismaClientSingleton: () => PrismaClient<{
    datasources: {
        db: {
            url: string | undefined;
        };
    };
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
declare const gygPrismaClientSingleton: () => PrismaClient<{
    datasources: {
        db: {
            url: string | undefined;
        };
    };
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
declare global {
    var mainPrisma: undefined | ReturnType<typeof mainPrismaClientSingleton>;
    var gygPrisma: undefined | ReturnType<typeof gygPrismaClientSingleton>;
}
declare const mainPrisma: PrismaClient<{
    datasources: {
        db: {
            url: string | undefined;
        };
    };
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
declare const gygPrisma: PrismaClient<{
    datasources: {
        db: {
            url: string | undefined;
        };
    };
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
export { mainPrisma, gygPrisma };
export declare function getPrismaClient(databaseType?: 'main' | 'gyg'): PrismaClient<{
    datasources: {
        db: {
            url: string | undefined;
        };
    };
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare function testBothDatabases(): Promise<{
    main: {
        connected: boolean;
        error: string | null;
    };
    gyg: {
        connected: boolean;
        error: string | null;
    };
}>;
//# sourceMappingURL=dual-prisma.d.ts.map