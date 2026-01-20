import { GoogleGenAI, Type } from "@google/genai";
import { JiraIssue, TeamMember, GeminiAnalysisResult, Sprint } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeCapacity = async (
  team: TeamMember[],
  issues: JiraIssue[],
  sprints: Sprint[]
): Promise<GeminiAnalysisResult> => {
  const prompt = `
    Analyze the following project capacity data for a software team.
    
    Team Context:
    ${JSON.stringify(team)}

    Active and Future Sprints:
    ${JSON.stringify(sprints)}

    Backlog & Assigned Issues:
    ${JSON.stringify(issues)}

    Please provide:
    1. A short executive summary of the current capacity status.
    2. Identify specific risks (e.g., developers over capacity, key skills missing for assigned tasks, high priority items unassigned).
    3. Actionable recommendations to resolve these risks.
    4. Suggested allocations for unassigned or poorly assigned tasks to optimize velocity.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            risks: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            recommendations: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            suggestedAllocations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  issueKey: { type: Type.STRING },
                  suggestedAssigneeId: { type: Type.STRING },
                  reason: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as GeminiAnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return {
      summary: "Failed to generate analysis.",
      risks: ["System Error: Could not reach AI service."],
      recommendations: ["Check your network connection or API key quota."]
    };
  }
};

export const generateSampleData = async (projectDesc: string): Promise<{ team: TeamMember[], issues: JiraIssue[] }> => {
  const prompt = `
    Generate realistic sample data for a Jira-like capacity planner based on this project description: "${projectDesc}".
    
    Create 4-6 team members with different roles (Frontend, Backend, DevOps, QA).
    Create 15-20 Jira issues (Stories, Bugs, Tasks) spanning 2-3 sprints.
    Some issues should be assigned, some unassigned.
    Ensure story points are realistic (Fibonacci: 1, 2, 3, 5, 8, 13).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          team: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                role: { type: Type.STRING },
                avatar: { type: Type.STRING },
                capacityPerSprint: { type: Type.INTEGER },
                skills: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          issues: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                key: { type: Type.STRING },
                summary: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['Story', 'Bug', 'Task', 'Epic'] },
                priority: { type: Type.STRING, enum: ['Highest', 'High', 'Medium', 'Low'] },
                status: { type: Type.STRING, enum: ['To Do', 'In Progress', 'In Review', 'Done'] },
                assigneeId: { type: Type.STRING, nullable: true },
                storyPoints: { type: Type.INTEGER },
                sprintId: { type: Type.STRING, nullable: true }
              }
            }
          }
        }
      }
    }
  });

   const text = response.text;
   if (!text) throw new Error("No response");
   return JSON.parse(text);
}
