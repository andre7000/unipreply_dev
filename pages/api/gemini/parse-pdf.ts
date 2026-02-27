import { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { serverTimestamp, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";

// Check if API key is configured
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not configured in environment variables");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { file, fileName } = req.body;

    if (!file || !fileName) {
      return res.status(400).json({ error: "File and fileName are required" });
    }

    // Initialize the Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Prepare the prompt for parsing college data
    const prompt = `
    Parse this PDF document and extract the Common Data Set information. 
    Return the data in the exact JSON structure format shown below:
    
    {
      "Common_Data_Set": "string",
      "Institution": "string",
      "A_General_Information": {
        "A1_Address_Information": {
          "Name_of_College_University": "string",
          "Mailing_Address": "string",
          "City_State_Zip_Country": "string",
          "Main_Phone_Number": "string",
          "WWW_Home_Page_Address": "string",
          "Admissions_Phone_Number": "string",
          "Admissions_Office_Mailing_Address": "string",
          "Admissions_City_State_Zip_Country": "string",
          "Admissions_E_mail_Address": "string",
          "Separate_URL_for_online_application": "string"
        },
        "A2_Source_of_institutional_control": "string",
        "A3_Classify_your_undergraduate_institution": "string",
        "A4_Academic_year_calendar": "string",
        "A5_Degrees_offered": ["string"],
        "A6_Diversity_Equity_and_Inclusion": {
          "URL": "string"
        }
      },
      "B_Enrollment_and_Persistence": {
        "B1_Institutional_Enrollment_By_Gender": {
          "Undergraduate": {
            "Degree_seeking_first_time": {
              "Full_Time": {"Men": "number", "Women": "number", "Another_Gender": "number", "Unknown": "number"},
              "Part_Time": {"Men": "number", "Women": "number", "Another_Gender": "number", "Unknown": "number"}
            },
            "Other_first_year_degree_seeking": {
              "Full_Time": {"Men": "number", "Women": "number", "Another_Gender": "number", "Unknown": "number"},
              "Part_Time": {"Men": "number", "Women": "number", "Another_Gender": "number", "Unknown": "number"}
            },
            "All_other_degree_seeking": {
              "Full_Time": {"Men": "number", "Women": "number", "Another_Gender": "number", "Unknown": "number"},
              "Part_Time": {"Men": "number", "Women": "number", "Another_Gender": "number", "Unknown": "number"}
            },
            "Total_degree_seeking": {
              "Full_Time": {"Men": "number", "Women": "number", "Another_Gender": "number", "Unknown": "number"},
              "Part_Time": {"Men": "number", "Women": "number", "Another_Gender": "number", "Unknown": "number"}
            },
            "All_other_undergraduates_enrolled_in_credit_courses": {
              "Full_Time": {"Men": "number", "Women": "number", "Another_Gender": "number", "Unknown": "number"},
              "Part_Time": {"Men": "number", "Women": "number", "Another_Gender": "number", "Unknown": "number"}
            },
            "Total_Undergraduate": {
              "Full_Time": {"Men": "number", "Women": "number", "Another_Gender": "number", "Unknown": "number"},
              "Part_Time": {"Men": "number", "Women": "number", "Another_Gender": "number", "Unknown": "number"}
            }
          },
          "Graduate_and_Professional": {
            "Degree_seeking_first_time": {
              "Full_Time": {"Men": "number", "Women": "number", "Another_Gender": "number", "Unknown": "number"},
              "Part_Time": {"Men": "number", "Women": "number", "Another_Gender": "number", "Unknown": "number"}
            },
            "All_other_degree_seeking": {
              "Full_Time": {"Men": "number", "Women": "number", "Another_Gender": "number", "Unknown": "number"},
              "Part_Time": {"Men": "number", "Women": "number", "Another_Gender": "number", "Unknown": "number"}
            },
            "All_other_graduates_enrolled_in_credit_courses": {
              "Full_Time": {"Men": "number", "Women": "number", "Another_Gender": "number", "Unknown": "number"},
              "Part_Time": {"Men": "number", "Women": "number", "Another_Gender": "number", "Unknown": "number"}
            },
            "Total_Graduate_and_Professional": {
              "Full_Time": {"Men": "number", "Women": "number", "Another_Gender": "number", "Unknown": "number"},
              "Part_Time": {"Men": "number", "Women": "number", "Another_Gender": "number", "Unknown": "number"}
            }
          },
          "Total_all_Undergraduate": "number",
          "Total_all_Graduate_and_Professional": "number",
          "Grand_Total_All_Students": "number"
        },
        "B2_Enrollment_by_Racial_Ethnic_Category": {
          "International": {"Degree_Seeking_First_Time_First_Year": "number", "Degree_Seeking_Undergraduates": "number", "Total_Undergraduates": "number"},
          "Hispanic_Latino": {"Degree_Seeking_First_Time_First_Year": "number", "Degree_Seeking_Undergraduates": "number", "Total_Undergraduates": "number"},
          "Black_or_African_American_non_Hispanic": {"Degree_Seeking_First_Time_First_Year": "number", "Degree_Seeking_Undergraduates": "number", "Total_Undergraduates": "number"},
          "White_non_Hispanic": {"Degree_Seeking_First_Time_First_Year": "number", "Degree_Seeking_Undergraduates": "number", "Total_Undergraduates": "number"},
          "American_Indian_or_Alaska_Native_non_Hispanic": {"Degree_Seeking_First_Time_First_Year": "number", "Degree_Seeking_Undergraduates": "number", "Total_Undergraduates": "number"},
          "Asian_non_Hispanic": {"Degree_Seeking_First_Time_First_Year": "number", "Degree_Seeking_Undergraduates": "number", "Total_Undergraduates": "number"},
          "Native_Hawaiian_or_other_Pacific_Islander_non_Hispanic": {"Degree_Seeking_First_Time_First_Year": "number", "Degree_Seeking_Undergraduates": "number", "Total_Undergraduates": "number"},
          "Two_or_more_races_non_Hispanic": {"Degree_Seeking_First_Time_First_Year": "number", "Degree_Seeking_Undergraduates": "number", "Total_Undergraduates": "number"},
          "Race_and_or_ethnicity_unknown": {"Degree_Seeking_First_Time_First_Year": "number", "Degree_Seeking_Undergraduates": "number", "Total_Undergraduates": "number"},
          "Total": {"Degree_Seeking_First_Time_First_Year": "number", "Degree_Seeking_Undergraduates": "number", "Total_Undergraduates": "number"}
        },
        "B3_Degrees_awarded": {
          "Bachelor_s_degrees": "number",
          "Postbachelor_s_certificates": "number",
          "Master_s_degrees": "number",
          "Doctoral_degrees_research_scholarship": "number",
          "Doctoral_degrees_professional_practice": "number"
        },
        "B4_B12_Graduation_Rates": {
          "Fall_2018_Cohort_Six_Year_Graduation_Rate": "string",
          "Fall_2017_Cohort_Six_Year_Graduation_Rate": "string"
        },
        "B22_Retention_Rate": "string"
      },
      "C_First_Time_First_Year_Admission": {
        "C1_Applications": {
          "Total_applied": "number",
          "Men_applied": "number",
          "Women_applied": "number",
          "Another_gender_applied": "number",
          "Total_admitted": "number",
          "Men_admitted": "number",
          "Women_admitted": "number",
          "Another_gender_admitted": "number",
          "Total_enrolled": "number",
          "Full_time_men_enrolled": "number",
          "Full_time_women_enrolled": "number",
          "Full_time_unknown_gender_enrolled": "number",
          "Residency_Breakdown": {
            "Applied": {"In_State": "number", "Out_of_State": "number", "International": "number", "Unknown": "number"},
            "Admitted": {"In_State": "number", "Out_of_State": "number", "International": "number", "Unknown": "number"},
            "Enrolled": {"In_State": "number", "Out_of_State": "number", "International": "number", "Unknown": "number"}
          }
        },
        "C2_Waitlist_Policy": {
          "Has_waitlist": "boolean",
          "Waitlist_admitted": "number",
          "Is_ranked": "boolean"
        },
        "C3_High_School_Completion": "string",
        "C4_College_Preparatory_Program": "string",
        "C5_High_School_Units": {
          "Total_academic_units": {"Required": "number", "Recommended": "number"},
          "English": {"Required": "number", "Recommended": "number"},
          "Mathematics": {"Required": "number", "Recommended": "number"},
          "Science": {"Required": "number", "Recommended": "number"},
          "Science_Lab": {"Required": "number", "Recommended": "number"},
          "Foreign_language": {"Required": "number", "Recommended": "number"},
          "Social_studies": {"Required": "number", "Recommended": "number"},
          "History": {"Required": "number", "Recommended": "number"},
          "Academic_electives": {"Required": "number", "Recommended": "number"},
          "Visual_Performing_Arts": {"Required": "number", "Recommended": "number"}
        },
        "C7_Admission_Factors": {
          "Very_Important": ["string"],
          "Important": ["string"],
          "Considered": ["string"],
          "Not_Considered": ["string"]
        },
        "C8_SAT_and_ACT_Policies": {
          "Use_SAT_or_ACT_in_decisions": "boolean",
          "Policy": "string",
          "Use_for_advising": "boolean",
          "Latest_date_to_receive_scores": "string",
          "Placement_tests_used": ["string"]
        },
        "C9_First_Time_First_Year_Profile": {
          "Percent_Submitting_SAT": "string",
          "Number_Submitting_SAT": "number",
          "Percent_Submitting_ACT": "string",
          "Number_Submitting_ACT": "number",
          "SAT_Scores_25th_50th_75th_Percentiles": {
            "Composite": ["number"],
            "Evidence_Based_Reading_and_Writing": ["number"],
            "Math": ["number"]
          },
          "ACT_Scores_25th_50th_75th_Percentiles": {
            "Composite": ["number"],
            "Math": ["number"],
            "English": ["number"],
            "Writing": ["number"],
            "Science": ["number"],
            "Reading": ["number"]
          }
        },
        "C10_High_School_Class_Rank": {
          "Top_tenth": "string",
          "Top_quarter": "string",
          "Top_half": "string",
          "Percent_submitting_class_rank": "string"
        },
        "C13_C18_Admission_Policies": {
          "Application_Fee": {"Has_fee": "boolean", "Amount": "string", "Can_be_waived": "boolean"},
          "Application_closing_date": "string",
          "Notification_date": "string",
          "Reply_policy_date": "string",
          "Deferred_admission": {"Allowed": "boolean", "Max_period": "string"}
        },
        "C21_Early_Decision": {
          "Offered": "boolean",
          "Closing_date": "string",
          "Notification_date": "string",
          "Applications_received": "number",
          "Applicants_admitted": "number"
        },
        "C22_Early_Action": {
          "Offered": "boolean"
        }
      },
      "D_Transfer_Admission": {
        "D1_Enroll_transfer_students": "boolean",
        "D2_Fall_2024_Applicants": {
          "Applied": {"Men": "number", "Women": "number", "Another_Gender": "number", "Total": "number"},
          "Admitted": {"Men": "number", "Women": "number", "Another_Gender": "number", "Total": "number"},
          "Enrolled": {"Men": "number", "Women": "number", "Another_Gender": "number", "Total": "number"}
        },
        "D3_Terms": ["string"],
        "D4_Minimum_Credits_to_Apply": "string",
        "D5_Requirements": {
          "Required_of_All": ["string"],
          "Not_Required": ["string"]
        },
        "D9_Dates": {
          "Fall": {"Closing_Date": "string", "Notification_Date": "string", "Reply_Date": "string"},
          "Spring": {"Closing_Date": "string", "Notification_Date": "string", "Reply_Date": "string"}
        },
        "D13_D14_Maximum_Transfer_Credits": "string",
        "D16_Minimum_Credits_for_Bachelors": "number"
      },
      "E_Academic_Offerings_and_Policies": {
        "E1_Special_Study_Options": ["string"]
      },
      "F_Student_Life": {
        "F1_Percentages": {
          "Out_of_state": {"First_years": "string", "Undergraduates": "string"},
          "Fraternities": {"First_years": "string", "Undergraduates": "string"},
          "Sororities": {"First_years": "string", "Undergraduates": "string"},
          "College_owned_housing": {"First_years": "string", "Undergraduates": "string"},
          "Off_campus_or_commute": {"First_years": "string", "Undergraduates": "string"},
          "Age_25_and_older": {"First_years": "string", "Undergraduates": "string"},
          "Average_age_full_time": {"First_years": "number", "Undergraduates": "number"},
          "Average_age_all_students": {"First_years": "number", "Undergraduates": "number"}
        },
        "F3_ROTC": {
          "Army": "string",
          "Naval": "string",
          "Air_Force": "string"
        }
      },
      "G_Annual_Expenses": {
        "G1_Undergraduate_Full_Time_Costs_2025_2026": {
          "Tuition": {"Private_Institutions": "string"},
          "Required_Fees": {"First_Year": "string", "Undergraduates": "string"},
          "Food_and_Housing_on_campus": "string",
          "Housing_Only": "string",
          "Food_Only": "string"
        },
        "G5_Estimated_Expenses": {
          "Books_and_supplies": "string",
          "Other_expenses": "string"
        },
        "G6_Undergraduate_Per_Credit_Hour_Charges": "string"
      },
      "H_Financial_Aid": {
        "H1_Aid_Awarded_2024_2025_Estimated": {
          "Need_Based": {
            "Federal_Grants": "string",
            "State_Grants": "string",
            "Institutional_Grants": "string",
            "External_Grants": "string",
            "Total_Grants": "string",
            "Student_Loans": "string",
            "Federal_Work_Study": "string",
            "State_Other_Work_Study": "string",
            "Total_Self_Help": "string",
            "Parent_Loans": "string",
            "Tuition_Waivers": "string"
          },
          "Non_Need_Based": {
            "Federal_Grants": "string",
            "Institutional_Grants": "string",
            "External_Grants": "string",
            "Total_Grants": "string",
            "Student_Loans": "string",
            "Total_Self_Help": "string",
            "Parent_Loans": "string",
            "Tuition_Waivers": "string"
          }
        },
        "H2_Enrolled_Students_Awarded_Aid": {
          "First_Time_Full_Time_Freshmen": {
            "Number_of_students": "number",
            "Determined_to_have_need": "number",
            "Awarded_any_need_based_aid": "number",
            "Average_financial_aid_package": "string",
            "Average_need_based_scholarship_grant": "string"
          },
          "Full_Time_Undergraduates": {
            "Number_of_students": "number",
            "Determined_to_have_need": "number",
            "Awarded_any_need_based_aid": "number",
            "Average_financial_aid_package": "string",
            "Average_need_based_scholarship_grant": "string"
          }
        },
        "H5_Student_Borrowing_Class_of_2024": {
          "Any_loan_program": {"Percent": "string", "Average_Amount": "string"},
          "Federal_loan_programs": {"Percent": "string", "Average_Amount": "string"},
          "Private_student_loans": {"Percent": "string", "Average_Amount": "string"}
        },
        "H6_International_Undergraduates": {
          "Institutional_need_based_aid_available": "boolean",
          "Number_awarded_aid": "number",
          "Average_dollar_amount": "string",
          "Total_dollar_amount": "string"
        },
        "H8_H9_Financial_Aid_Forms_and_Dates": {
          "Forms_required": ["string"],
          "Priority_filing_date": "string",
          "Notification_date": "string",
          "Reply_date": "string"
        }
      },
      "I_Instructional_Faculty_and_Class_Size": {
        "I1_Faculty_Fall_2024": {
          "Total_instructional_faculty": {"Full_Time": "number", "Part_Time": "number", "Total": "number"},
          "Minority": {"Full_Time": "number", "Part_Time": "number", "Total": "number"},
          "Women": {"Full_Time": "number", "Part_Time": "number", "Total": "number"},
          "Men": {"Full_Time": "number", "Part_Time": "number", "Total": "number"},
          "Doctorate_or_terminal_degree": {"Full_Time": "number", "Part_Time": "number", "Total": "number"}
        },
        "I2_Student_to_Faculty_Ratio": "string",
        "I3_Undergraduate_Class_Size": {
          "2-9": "number",
          "10-19": "number",
          "20-29": "number",
          "30-39": "number",
          "40-49": "number",
          "50-99": "number",
          "100+": "number",
          "Total_Sections": "number"
        }
      },
      "J_Degrees_Conferred": {
        "J1_Bachelor_s_Degrees_2023_2024": {
          "Natural_resources_and_conservation": "string",
          "Architecture": "string",
          "Area_ethnic_and_gender_studies": "string",
          "Communication_journalism": "string",
          "Computer_and_information_sciences": "string",
          "Education": "string",
          "Engineering": "string",
          "Foreign_languages_literatures_and_linguistics": "string",
          "English": "string",
          "Biological_life_sciences": "string",
          "Mathematics_and_statistics": "string",
          "Interdisciplinary_studies": "string",
          "Philosophy_and_religious_studies": "string",
          "Physical_sciences": "string",
          "Psychology": "string",
          "Social_sciences": "string",
          "Visual_and_performing_arts": "string",
          "Business_marketing": "string",
          "History": "string"
        }
      }
    }
    
    Extract all available data from the PDF and populate this structure. If any specific field is not available in the document, use null for that field. Return ONLY valid JSON without any additional text or explanations.
    `;

    // Create the part for the PDF file
    const imagePart = {
      inlineData: {
        data: file,
        mimeType: "application/pdf",
      },
    };

    // Generate content with the PDF
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response from Gemini
    let parsedData;
    try {
      // Remove markdown code blocks if present
      const jsonText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsedData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", text);
      return res.status(500).json({
        error: "Failed to parse PDF data",
        details: "Gemini response was not valid JSON",
      });
    }

    // Extract institution and year for document ID
    const institution =
      parsedData.Institution ||
      parsedData.A_General_Information?.A1_Address_Information
        ?.Name_of_College_University ||
      "";
    const year = parsedData.Common_Data_Set || "";

    if (!institution) {
      return res.status(400).json({
        error: "Could not extract institution name from PDF",
        details: "The PDF must contain a valid institution name",
      });
    }

    // Generate document ID from institution and year
    const docId = `${institution
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/_+/g, "_")
      .replace(
        /^_|_$/g,
        "",
      )}${year ? `_${year.replace(/[^a-z0-9]+/gi, "_")}` : ""}`;

    // Check for existing document with same ID
    const docRef = doc(db, "collegeDatasets", docId);
    const existingDoc = await getDoc(docRef);

    if (existingDoc.exists()) {
      return res.status(409).json({
        error: "Duplicate document",
        message: `Data for ${institution} (${year}) already exists`,
        existingId: docId,
      });
    }

    // Store in Firestore with custom document ID
    await setDoc(docRef, {
      ...parsedData,
      uploadedAt: serverTimestamp(),
      status: "processed",
      fileName,
    });

    // Return success response with document ID
    res.status(200).json({
      success: true,
      data: parsedData,
      fileName,
      docId,
    });
  } catch (error) {
    console.error("Error processing PDF with Gemini:", error);

    // More detailed error logging
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Full error details:", error);

    res.status(500).json({
      error: "Failed to process PDF",
      details: errorMessage,
    });
  }
}
