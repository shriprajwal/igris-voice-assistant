import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  console.time("vision_call");
  // Test with downscaled tiny image
  try {
    const resp = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
          }
        },
        `Locate close button. Return JSON: {"found": true, "label": "Close", "type": "button", "x": 100, "y": 100, "confidence": 0.9, "description": "close"}`
      ],
      config: {
        responseMimeType: "application/json"
      }
    });
    console.timeEnd("vision_call");
    console.log("RESULT:", resp.text);
  } catch (e: any) {
    console.error("ERROR:", e);
  }
}

test();
