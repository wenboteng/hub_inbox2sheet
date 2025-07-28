declare function checkViennaReportStatus(): Promise<{
    reportExists: boolean;
    reportData: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        slug: string;
        type: string;
        isPublic: boolean;
    } | null;
    totalPublicReports: number;
}>;
export { checkViennaReportStatus };
//# sourceMappingURL=check-vienna-report-status.d.ts.map