declare function checkViennaReportStatus(): Promise<{
    reportExists: boolean;
    reportData: {
        id: string;
        type: string;
        title: string;
        content: string;
        createdAt: Date;
        updatedAt: Date;
        isPublic: boolean;
        slug: string;
    } | null;
    totalPublicReports: number;
}>;
export { checkViennaReportStatus };
//# sourceMappingURL=check-vienna-report-status.d.ts.map