import { Octokit } from "octokit";

export async function POST(req: Request) {
    try {
        const { history } = await req.json();

        // Use standard GITHUB_TOKEN if available, otherwise just warn (user should provide it in env)
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            return Response.json({
                error: "Missing GITHUB_TOKEN",
                details: "Silakan tambahkan GITHUB_TOKEN di .env.local untuk fitur backup cloud."
            }, { status: 500 });
        }

        const octokit = new Octokit({ auth: token });
        const owner = process.env.GITHUB_OWNER || "raaOS";
        const repo = process.env.GITHUB_REPO || "Kurir";
        const path = "history-dump.json";

        // 1. Get current file content (if exists) to get SHA
        let sha: string | undefined;
        try {
            const { data: fileData }: any = await octokit.rest.repos.getContent({
                owner,
                repo,
                path,
            });
            sha = fileData.sha;
        } catch (e) {
            // File might not exist yet
        }

        // 2. Push update
        await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message: "Cloud Backup: Route History Update",
            content: Buffer.from(JSON.stringify(history, null, 2)).toString("base64"),
            sha,
        });

        return Response.json({ success: true });
    } catch (error: any) {
        console.error("Backup Error:", error);
        return Response.json({
            error: "Failed to backup",
            details: error.message
        }, { status: 500 });
    }
}

export async function GET() {
    try {
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            return Response.json({ error: "Missing GITHUB_TOKEN" }, { status: 500 });
        }

        const octokit = new Octokit({ auth: token });
        const owner = process.env.GITHUB_OWNER || "raaOS";
        const repo = process.env.GITHUB_REPO || "Kurir";
        const path = "history-dump.json";

        try {
            const { data }: any = await octokit.rest.repos.getContent({
                owner,
                repo,
                path,
            });

            const content = Buffer.from(data.content, "base64").toString();
            return Response.json({ history: JSON.parse(content) });
        } catch (e) {
            // File might not exist yet, return empty
            return Response.json({ history: [] });
        }
    } catch (error: any) {
        console.error("Fetch Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
