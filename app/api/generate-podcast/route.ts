import { NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
  }

  const formData = await request.formData();
  const incomingFiles = formData.getAll("files");
  const files = incomingFiles.filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No se han recibido archivos" }, { status: 400 });
  }

  try {
    const uploads = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());

        return openai.files.create({
          file: await toFile(buffer, file.name, { type: file.type || "application/pdf" }),
          purpose: "assistants",
        });
      }),
    );

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      attachments: uploads.map((upload) => ({
        file_id: upload.id,
        tools: [{ type: "file_search" }],
      })),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Analiza los documentos proporcionados y crea un diálogo entre dos personas que pueda utilizarse como podcast. El diálogo debe ser informativo y entretenido.",
            },
          ],
        },
      ],
    });

    const dialogue = response.output_text?.trim();

    if (!dialogue) {
      return NextResponse.json({ error: "No se pudo generar el diálogo" }, { status: 500 });
    }

    return NextResponse.json({ dialogue });
  } catch (error) {
    console.error("Failed to generate podcast", error);
    return NextResponse.json({ error: "Error al generar el podcast" }, { status: 500 });
  }
}
