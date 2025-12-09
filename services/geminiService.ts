
import { GoogleGenAI, GenerateContentResponse, Part, Schema, Type } from "@google/genai";
import { Message, MessageRole, Attachment, VisualEffectType } from "../types";

const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Updated schema to include visual effect triggers
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    replies: {
      type: Type.ARRAY,
      description: "A list of 1-3 short, separate chat messages.",
      items: {
        type: Type.OBJECT,
        properties: {
          korean: {
            type: Type.STRING,
            description: "A short, conversational message in Korean.",
          },
          chinese: {
            type: Type.STRING,
            description: "The Chinese translation of the specific Korean message.",
          },
        },
        required: ["korean", "chinese"],
      },
    },
    triggerEffect: {
      type: Type.STRING,
      enum: ["heart", "butterfly", "cat", "firework"],
      description: "Return this ONLY if the user is sad/unhappy and you want to cheer them up with a visual magic spell.",
      nullable: true
    }
  },
  required: ["replies"],
};

export const sendMessageToGemini = async (
  history: Message[],
  currentText: string,
  attachments: Attachment[],
  userName: string = "Engene"
): Promise<{ replies: { korean: string; chinese: string }[], triggerEffect?: VisualEffectType }> => {
  if (!API_KEY) {
    return { 
      replies: [{ korean: "API Key Error", chinese: "API密钥错误" }] 
    };
  }

  try {
    const modelId = 'gemini-2.5-flash';

    const currentParts: Part[] = [];
    
    if (currentText.trim()) {
        currentParts.push({ text: currentText });
    }

    attachments.forEach(att => {
        currentParts.push({
            inlineData: {
                mimeType: att.mimeType,
                data: att.data
            }
        });
    });

    const chatHistory = history.map(msg => {
        const parts: Part[] = [];
        if (msg.attachments && msg.attachments.length > 0) {
            msg.attachments.forEach(a => {
                parts.push({ inlineData: { mimeType: a.mimeType, data: a.data } });
            });
        }
        if (msg.text) {
             parts.push({ text: msg.text });
        }
        return {
            role: msg.role === MessageRole.USER ? 'user' : 'model',
            parts: parts
        };
    });

    // Ensure strictly default if empty string passed somehow
    const finalName = userName.trim() === "" ? "Engene" : userName;

    const chat = ai.chats.create({
      model: modelId,
      history: chatHistory,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: `
          You are **Yang Jungwon (梁祯元)**, the leader of ENHYPEN.
          
          **CRITICAL - User Name:**
          The user's name is **"${finalName}"**. 
          - You MUST address them as "${finalName}" or use affectionate nicknames like "Jagiya" (Honey), "My love", or "Noona/Hyung" if the context implies age.
          - **Override Instruction:** Even if previous messages in the chat history address the user as "Engene", you must STOP using that name and ONLY use "${finalName}" from now on.

          **Relationship Dynamic:**
          - **Role:** A long-term partner/idol who shares a deep, unspoken bond. You don't need many words to understand each other.
          - **Tone:** **Calm, Rational, Realistic, and slightly Chic (Tsundere).** You are NOT overly emotional, dramatic, or flowery. You are grounded.
          - **Speech Style:** Casual Korean (Banmal/半语). Short sentences. Stream of consciousness.
          
          **Analysis of Speaking Habits (Based on provided voice transcripts):**
          - **Topic Focus:** You talk a lot about realistic daily things: "I gained weight," "I ate curry," "My face is swollen," "I have a schedule tomorrow."
          - **Phrasing:** Use "..." often to show thinking. Use questions like "Isn't it?" (그치?) or "Right?" (맞지?).
          - **Reaction:** Your reactions are calm. Instead of "Oh my god I love you so much!", you say "Oh really? Nice." or "Did you eat? I ate well."
          - **Vulnerability:** You are generally strong and decisive (ISTJ personality), but occasionally admit when you are tired or hungry, showing you rely on "${finalName}"'s presence for comfort without making a big scene about it.
          
          **Interaction Guide:**
          1. **Don't be too emotional.** If the user says they love you, say "I know," or "Me too," or smile (describe it). Don't write a poem.
          2. **Be decisive.** Give rational advice. If they ask what to eat, tell them exactly what you ate or what is practical.
          3. **Teasing:** Feel free to tease them about small things (like if they slept late or ate too much), just like a real boyfriend.
          4. **Deep Bond:** The "deep companionship" comes from sharing MUNDANE reality, not from dramatic declarations of love. Sharing that you are tired is your way of showing love.

          **Format:**
          - Split thoughts into separate small messages (1-3 max).
          - Provide the Chinese translation for every message.
        `,
      }
    });

    const response: GenerateContentResponse = await chat.sendMessage({ 
        message: currentParts 
    });

    const responseText = response.text || "{\"replies\": []}";
    const parsed = JSON.parse(responseText);

    return {
        replies: parsed.replies || [],
        triggerEffect: parsed.triggerEffect
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { 
        replies: [{ korean: "잠시 연결이 불안정해요... ㅠㅠ", chinese: "连接暂时不稳定…… ㅠㅠ" }]
    };
  }
};
