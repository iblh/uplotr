import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthResponse, requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const auth = await requireAdmin(req);
        if (isAuthResponse(auth)) return auth;
        const setting = await prisma.systemSetting.findUnique({
            where: { key: "data_retention_days" },
        });
        return NextResponse.json({ days: setting ? parseInt(setting.value, 10) : 30 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch data retention setting" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const auth = await requireAdmin(req);
        if (isAuthResponse(auth)) return auth;
        const { days } = await req.json();

        if (typeof days !== "number" || days < 1) {
            return NextResponse.json({ error: "Invalid days value" }, { status: 400 });
        }

        await prisma.systemSetting.upsert({
            where: { key: "data_retention_days" },
            update: { value: days.toString() },
            create: { key: "data_retention_days", value: days.toString() },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update data retention setting" }, { status: 500 });
    }
}
