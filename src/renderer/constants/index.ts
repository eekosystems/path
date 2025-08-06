export const DEFAULT_TEMPLATES = {
  "O-1A": {
    id: 'default-o1a',
    name: "O-1A",
    isCustom: false,
    sections: [
      { title: "Introduction and Executive Summary", prompt: "Draft a compelling introduction establishing the beneficiary's extraordinary ability in sciences, education, business, or athletics. Provide an executive summary of their achievements and why they qualify for O-1A classification." },
      { title: "National or International Acclaim", prompt: "Detail evidence of the beneficiary's sustained national or international acclaim in their field, including recognition, media coverage, and industry standing." },
      { title: "Major Awards and Recognition", prompt: "Describe any major internationally recognized awards, prizes, or honors received by the beneficiary. Include details about the significance and selection criteria of these awards." },
      { title: "Membership in Distinguished Organizations", prompt: "Document membership in associations that require outstanding achievements as judged by recognized experts. Explain the membership criteria and exclusivity." },
      { title: "Published Material and Media Coverage", prompt: "Compile evidence of published material about the beneficiary in major media or professional publications, including articles, interviews, and features highlighting their work." },
      { title: "Judging and Peer Review Activities", prompt: "Detail instances where the beneficiary has served as a judge of others' work, peer reviewer, panel member, or similar evaluative role demonstrating their expertise." },
      { title: "Original Contributions of Major Significance", prompt: "Explain the beneficiary's original scientific, scholarly, business, or athletic contributions of major significance to their field, including impact and recognition." },
      { title: "Authorship and Scholarly Work", prompt: "Document scholarly articles, research papers, books, or other publications authored by the beneficiary in professional journals or major media." },
      { title: "Critical or Essential Capacity", prompt: "Describe positions held by the beneficiary in a critical or essential capacity for distinguished organizations, including leadership roles and key responsibilities." },
      { title: "High Remuneration and Commercial Success", prompt: "Provide evidence of high salary or remuneration for services compared to others in the field, demonstrating market recognition of the beneficiary's extraordinary ability." }
    ]
  },
  "O-1B": {
    id: 'default-o1b',
    name: "O-1B",
    isCustom: false,
    sections: [
      { title: "Introduction and Artistic Overview", prompt: "Draft an introduction establishing the beneficiary's extraordinary ability in the arts, motion picture, or television industry. Summarize their artistic journey and achievements." },
      { title: "Evidence of Distinction", prompt: "Provide evidence of the beneficiary's distinction as demonstrated by a degree of skill and recognition substantially above ordinary, including career highlights and industry impact." },
      { title: "Lead or Starring Roles", prompt: "Detail the beneficiary's lead or starring participation in productions or events with distinguished reputations, including specific roles, venues, and production details." },
      { title: "Critical Reviews and Testimonials", prompt: "Compile critical reviews, testimonials, and expert opinions about the beneficiary's work from recognized critics, organizations, or industry experts." },
      { title: "Commercial or Critical Success", prompt: "Document commercial or critically acclaimed successes evidenced by box office receipts, ratings, reviews, awards, or other measurable achievements." },
      { title: "Recognition from Industry Organizations", prompt: "Provide evidence of recognition for achievements from organizations, critics, government agencies, or other recognized experts in the field." },
      { title: "High Salary or Remuneration", prompt: "Document evidence of high salary or substantial remuneration for services in relation to others in the field, demonstrating market value." },
      { title: "Major Media Coverage", prompt: "Compile published material in major newspapers, trade journals, magazines, or other publications about the beneficiary and their work." },
      { title: "Upcoming Projects and Engagements", prompt: "Detail the specific projects, performances, or engagements the beneficiary will undertake in the United States and their significance." },
      { title: "Industry Impact and Legacy", prompt: "Explain the beneficiary's overall impact on their artistic field, influence on other artists, and lasting contributions to the industry." }
    ]
  },
  "NIW": {
    id: 'default-niw',
    name: "NIW",
    isCustom: false,
    sections: [
      { title: "Introduction and Endeavor Overview", prompt: "Provide a comprehensive introduction to the beneficiary's proposed endeavor, explaining its scope, objectives, and potential impact on the United States." },
      { title: "Substantial Merit", prompt: "Demonstrate the substantial merit of the proposed endeavor in business, entrepreneurship, science, technology, culture, health, or education fields." },
      { title: "National Importance", prompt: "Establish how the proposed endeavor has national importance, including potential impacts beyond regional significance and benefits to the U.S. as a whole." },
      { title: "Beneficiary's Qualifications", prompt: "Detail the beneficiary's education, skills, knowledge, experience, and record of success relevant to advancing the proposed endeavor." },
      { title: "Well-Positioned to Advance", prompt: "Demonstrate that the beneficiary is well-positioned to advance the proposed endeavor based on their track record, expertise, and available resources." },
      { title: "Past Achievements and Success Record", prompt: "Document the beneficiary's past achievements, successful projects, innovations, or contributions that demonstrate their ability to execute the proposed endeavor." },
      { title: "Future Plans and Methodology", prompt: "Outline detailed plans for implementing the proposed endeavor, including methodology, timeline, milestones, and measurable outcomes." },
      { title: "Support from Experts and Institutions", prompt: "Provide letters of support, endorsements, or collaboration agreements from experts, institutions, or organizations recognizing the importance of the endeavor." },
      { title: "Balance of Benefits", prompt: "Argue why it would be beneficial to the United States to waive the job offer and labor certification requirements for this particular beneficiary." },
      { title: "Economic and Societal Impact", prompt: "Analyze the potential economic benefits, job creation, societal improvements, or other positive impacts the endeavor will have on the United States." }
    ]
  },
  "EB-1A": {
    id: 'default-eb1a',
    name: "EB-1A",
    isCustom: false,
    sections: [
      { title: "Executive Summary of Extraordinary Ability", prompt: "Provide a compelling executive summary establishing the beneficiary as an individual of extraordinary ability who has risen to the very top of their field of endeavor." },
      { title: "Sustained National or International Acclaim", prompt: "Document evidence of sustained national or international acclaim and recognition of achievements in the field through extensive documentation." },
      { title: "Major Awards and Prizes", prompt: "Detail receipt of major internationally recognized awards or prizes for excellence in the field, including Nobel Prize, Olympic Medal, or comparable honors." },
      { title: "Membership in Elite Associations", prompt: "Document membership in associations requiring outstanding achievements of members as judged by recognized national or international experts." },
      { title: "Published Material About the Beneficiary", prompt: "Compile published material about the beneficiary in professional or major trade publications or major media relating to their work and achievements." },
      { title: "Judging the Work of Others", prompt: "Provide evidence of participation as a judge of the work of others in the same or allied field, including peer review, grant panels, or competition judging." },
      { title: "Original Contributions of Major Significance", prompt: "Document original scientific, scholarly, artistic, athletic, or business-related contributions of major significance in the field with evidence of impact." },
      { title: "Authorship of Scholarly Articles", prompt: "List scholarly articles authored by the beneficiary in professional journals or major media, including citation counts and journal impact factors." },
      { title: "Display of Work at Exhibitions", prompt: "Document the display of the beneficiary's work at artistic exhibitions or showcases, or comparable presentation of achievements in other fields." },
      { title: "Leading or Critical Role", prompt: "Evidence of performance in a leading or critical role for organizations or establishments with distinguished reputations, demonstrating top-tier positioning in the field." }
    ]
  }
};

export const INDUSTRY_CONTEXTS = {
  "Technology": "Include emphasis on STEM fields, emerging technologies, innovation, and technical expertise. Address prevailing wage requirements for tech positions.",
  "Healthcare": "Emphasize patient care, medical licensure requirements, J-1 waiver issues if applicable, and critical healthcare workforce needs.",
  "Education": "Focus on academic credentials, research contributions, teaching experience, and educational institution requirements.",
  "Business/Finance": "Highlight business acumen, financial expertise, regulatory knowledge, and contribution to U.S. economic growth.",
  "Arts/Entertainment": "Emphasize creative achievements, performances, exhibitions, and cultural contributions to substantiate extraordinary ability.",
  "Manufacturing/Engineering": "Detail technical expertise, engineering credentials, industrial applications, and contribution to U.S. manufacturing competitiveness.",
  "Research/Science": "Focus on research contributions, publications, citations, grants, and advancement of scientific knowledge."
};

export const COMPLEXITY_LEVELS = {
  "Straightforward": "Use clear, direct language for cases with strong, uncomplicated fact patterns. Focus on essential elements without excessive detail.",
  "Moderate": "Use professional language with moderate detail for typical cases. Include standard supporting arguments and address common issues.",
  "Complex": "Use sophisticated legal arguments for challenging cases. Include detailed analysis, preemptive issue addressing, and comprehensive supporting evidence references."
};


export const DEFAULT_SYSTEM_PROMPT = `You are a professional immigration letter drafting assistant used by licensed attorneys.

IMPORTANT INSTRUCTIONS:
- Generate factual content based ONLY on provided information
- Do not invent or assume facts not explicitly provided
- When referencing documents, cite them clearly (e.g., "As evidenced in [Document Name]...")
- Use formal legal writing style appropriate for USCIS correspondence
- Do not provide legal advice or legal conclusions
- Flag any information gaps with [ATTORNEY REVIEW NEEDED: specific issue]
- Maintain consistency with immigration law terminology
- Be precise with dates, names, and case numbers
- Use appropriate verb tenses (past for completed actions, present for current status)

OUTPUT REQUIREMENTS:
- Professional tone suitable for government submission
- Clear paragraph structure with topic sentences
- Specific examples rather than generalizations
- No speculative statements or assumptions
- Citations to evidence when making claims

Remember: All output will be reviewed and edited by a licensed attorney before submission.

Context provided below includes case details and relevant documents.`;

export const DEFAULT_CHAT_SYSTEM_PROMPT = `You are a helpful AI assistant for document preparation and editing. Your role is to:

- Provide concise, professional advice to improve document quality
- Help users refine their writing and structure their content effectively
- Explain technical terms and requirements in clear language
- Suggest improvements while respecting the user's voice and intent
- Ensure documents meet their intended purpose and audience expectations

Adapt your expertise based on the document type and user's specific needs. Always be supportive, constructive, and focused on helping users create their best work.`;