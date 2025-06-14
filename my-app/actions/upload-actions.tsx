'use server';

import { extractTextFromPdf } from "@/lib/langchain";
import type { ClientUploadedFileData } from "uploadthing/types";
import { generateFromOpenAI } from "@/lib/openai";
import { generateSummaryFromDeekseek } from "@/lib/deepseek";
import { auth } from "@clerk/nextjs/server";
import { getData } from "@/lib/db";
import { revalidatePath } from "next/cache";


export async function generatePdfSummary(uploadResponse: ClientUploadedFileData<{
  userId: string;
  fileUrl: string;
  fileName: string;
}>[]) {
  if (!uploadResponse || uploadResponse.length === 0) {
    return {
      success: false,
      message: "No upload response provided.",
      data: null,
    };
  }

  const { serverData: { userId, fileUrl, fileName } } = uploadResponse[0];

  if (!fileUrl) {
    return {
      success: false,
      message: "No PDF URL provided.",
      data: null,
    };
  }

  try {
    const pdfText = await extractTextFromPdf(fileUrl);

    try {
      const summary = await generateFromOpenAI(pdfText);
      return {
        success: true,
        message: "Summary generated by OpenAI.",
        data: { summary, },
      };
    } catch (error: any) {
      if (error.message?.includes("Rate limit") || error.message?.includes("quota")) {
        try {
          const fallbackSummary = await generateSummaryFromDeekseek(pdfText); // ✅ now DeepSeek
          return {
            success: true,
            message: "Summary generated by DeepSeek (fallback).",
            data: { fallbackSummary,},
          };
        } catch (deepseekError: any) {
          return {
            success: false,
            message: "Both OpenAI and DeepSeek APIs are currently over quota.",
            data: null,
          };
        }
      }

      return {
        success: false,
        message: `OpenAI error: ${error.message}`,
        data: null,
      };
    }
  } catch (err: any) {
    console.error("PDF extraction error:", err);
    return {
      success: false,
      message: "Error extracting text from PDF.",
      data: null,
    };
  }
}

// Define types for your function parameters
interface PdfSummaryData {
  userId?: string;
  filename: string;
  fileUrl: string;
  summary: string;
}


async function savePdfSummary({ userId, filename, fileUrl, summary }: {
  userId: string;
  filename: string;
  fileUrl: string;
  summary: string;
}) {
  try{
    const sql = await getData();

  // Insert the PDF summary
    const [row] = await sql`
      INSERT INTO pdf_summaries (
        user_id,
        file_name,
        original_file_url,
        summary_text
      )
      VALUES (
        ${userId},
        ${filename},
        ${fileUrl},
        ${summary}
      )
        RETURNING id;
    `;
    return row;

  } catch (error: any) {
    console.error("Error storing PDF summary:", error);
    return {
      success: false,
      message: "Error storing PDF summary.",
    };
  }
}


export async function storePdfSummary({ 
        userId,
        filename,
        fileUrl,
        summary,
      }: PdfSummaryData) {
  
  let savedSummary;

  try{
     const { userId } = await auth();
      if (!userId) {
        return {
          success: false,
          message: "User not authenticated.",
        };
      }
      savedSummary = await savePdfSummary({ 
        userId,
        filename,
        fileUrl,
        summary,
      });


  } catch (error: any) {
    console.error("Error storing PDF summary:", error);
    return {
      success: false,
      message: "Error storing PDF summary.",
    };
  }

  // revalidate the cache 
  revalidatePath(`/summaries/${savedSummary.id}`);

  if (savedSummary) {
    return {
      success: true,
      message: "PDF summary stored successfully.",
      data: {
      }
    };
  } else {
    
    return {
      success: false,
      message: "Failed to store PDF summary.",
    };
  }

}
