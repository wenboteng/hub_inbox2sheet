declare function checkViennaReportStatus(): Promise<{
    reportExists: boolean;
    reportData: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        slug: string;
        title: string;
        content: string;
        isPublic: boolean;
    } | null;
    totalPublicReports: number;
}>;
export { checkViennaReportStatus };
//# sourceMappingURL=check-vienna-report-status.d.ts.map