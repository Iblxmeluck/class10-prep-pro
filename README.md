# Remix of CBSE Mastery Hub

Create a modern, responsive Class 10 CBSE Question & Answer Learning Platform with an Admin Panel, Member Login System, AI Question Generation, Question Bank, PDF/Image Resources, permissions, and detailed student activity tracking.



1. Overall Goal



Build a secure educational website where selected Class 10 students can log in using a username and password created by the admin.



The admin must have complete control over:



- Which students can access the website

- Which subjects/chapters they can see

- Which question types they can access

- Which PDFs/images they can access

- Whether they can download resources

- Their MCQ performance

- Their activity and download history



The website must be designed specifically for CBSE Class 10 NCERT-based preparation.



---



2. User Roles



Create two roles:



ADMIN



Full access to the administration panel.



MEMBER



Student account with access controlled by the admin.



Do NOT allow students to register themselves.



Only the admin can create member accounts.



---



3. Login System



Create a professional login page.



Fields:



- Username

- Password



Features:



- Secure authentication

- Password hashing

- Logout

- Session management

- Protected routes

- Admin/member role verification

- No public registration



After login:



ADMIN → Admin Dashboard



MEMBER → Member Dashboard



---



4. Admin Dashboard



Create a professional admin dashboard showing:



Statistics



- Total members

- Active members

- Total questions

- Total tests

- Total PDFs

- Total images

- Total attempts

- Total downloads



Member Overview



Show:



Member| Attempts| Correct| Incorrect| Accuracy| Downloads| Status



Allow admin to click a member and see their complete activity.



---



5. Member Management



Admin can:



- Create member

- Edit member

- Delete/deactivate member

- Change username

- Reset password

- Activate/deactivate account

- View member activity

- View member performance

- Assign permissions



Member fields:



- Username

- Display name

- Password

- Account status

- Created date

- Permissions



Never display stored passwords in the admin panel.



---



6. Permission / Access Key System



Create a flexible permission system.



Admin can decide exactly what each member can access.



Permissions should support:



Subjects



- Mathematics

- Science

- Social Science

- English

- Hindi



Chapter access



Admin can enable/disable individual chapters.



Question types



Admin can enable/disable:



- MCQ

- Assertion & Reason

- Case Study

- Competency Based

- Numerical

- Image Based

- Diagram Based

- Source Based

- Map Based

- Extract Based

- Grammar



Resource permissions



Admin can control:



- View PDF

- Download PDF

- View image

- Download image



Example:



Student001



Mathematics: YES

Science: YES

Social Science: NO

English: YES



MCQ: YES

Case Study: YES

Assertion & Reason: NO



PDF View: YES

PDF Download: NO



Image View: YES

Image Download: YES



Create reusable Access Packages/Keys so the admin can assign a predefined permission package to members.



---



7. Member Dashboard



Create a clean student dashboard.



Display:



Welcome, [Student Name]



Your Progress



Questions Attempted

Correct

Incorrect

Accuracy

Tests Completed



Add subject cards:



- Mathematics

- Science

- Social Science

- English

- Hindi



Only show subjects that the member has permission to access.



---



8. Subject Structure



Organize content as:



Subject

   ↓

Chapter

   ↓

Topic

   ↓

Question Type

   ↓

Questions



For example:



Mathematics

 └── Quadratic Equations

      ├── MCQ

      ├── Assertion & Reason

      ├── Case Study

      ├── Competency Based

      └── Numericals



---



9. Question Bank



Create an admin question-management system.



Admin can:



- Create question

- Edit question

- Delete question

- Publish/unpublish question

- Assign subject

- Assign chapter

- Assign topic

- Assign difficulty

- Assign question type

- Add options

- Set correct answer

- Add explanation

- Add image

- Add marks



Difficulty levels:



- Easy

- Medium

- Hard

- Very Hard



Question status:



- Draft

- Published

- Archived



Only published questions should appear to members.



---



10. AI Question Generator



Create an AI question-generation section inside the admin panel.



Admin selects:



Subject

Chapter

Topic

Question Type

Difficulty

Number of Questions

Marks



Example:



Subject: Mathematics

Chapter: Quadratic Equations

Type: MCQ

Difficulty: Hard

Questions: 20



The AI should generate:



- Question

- Four options

- Correct answer

- Explanation

- Difficulty

- Topic

- NCERT/CBSE relevance



IMPORTANT:



AI-generated questions must initially be saved as DRAFT.



Admin must review and approve them before they become visible to members.



Never automatically publish AI-generated questions.



---



11. MCQ System



Create an interactive MCQ interface.



Features:



- Question number

- Question text

- Options A/B/C/D

- Next

- Previous

- Submit

- Question navigation

- Timer for tests

- Mark for review

- Skip question



After submission show:



- Correct/incorrect

- Correct answer

- Explanation

- Marks obtained



Store every attempt in the database.



---



12. Performance Tracking



For every member track:



- Questions attempted

- Correct answers

- Incorrect answers

- Skipped questions

- Accuracy

- Marks

- Time spent

- Tests completed



Calculate:



Accuracy =

Correct Answers / Attempted Questions × 100



Show performance by:



Subject



Mathematics     91%

Science         84%

SST             76%

English         89%



Chapter



Real Numbers             95%

Polynomials              88%

Quadratic Equations      93%

Arithmetic Progressions  72%



Create charts for performance.



---



13. Weak Topic Detection



Automatically identify topics where the student performs poorly.



For example:



Weak Topics



Arithmetic Progressions

Accuracy: 62%



Pair of Linear Equations

Accuracy: 68%



Admin should be able to see these weak areas.



---



14. PDF Resource System



Admin can upload:



- NCERT notes

- Revision notes

- Question papers

- Worksheets

- Sample papers

- Study material

- Practice sets



Each resource should have:



- Name

- Subject

- Chapter

- Description

- File

- Upload date

- View permission

- Download permission



Only members with permission can access the resource.



---



15. Image Question System



Admin can upload image-based questions.



Examples:



- Maths graphs

- Science diagrams

- SST maps

- Source images

- Case-study images



Members can view the images if permitted.



Admin can separately control whether each member can download them.



---



16. Download Tracking



Whenever a member downloads a PDF or image, record:



Member

Resource

Resource type

Date

Time



Admin should be able to see:



Student001

Water Resources Notes.pdf

Downloaded

23 Aug 2026

7:42 PM



Create a download history page with filtering by member, subject and resource.



---



17. Activity Log



Create an admin activity log.



Track events such as:



- Login

- Logout

- Question attempted

- Test submitted

- PDF viewed

- PDF downloaded

- Image viewed

- Image downloaded



Example:



Student001

Attempted MCQ

Mathematics → Quadratic Equations

23 Aug 2026, 7:30 PM



---



18. Admin Test Builder



Admin should be able to create tests.



Test settings:



Test Name

Subject

Chapters

Question Types

Number of Questions

Duration

Total Marks

Difficulty



Admin can select specific questions or allow the system to randomly select questions.



---



19. Member Test Interface



Students can take tests assigned to them.



Display:



- Timer

- Question navigation

- Answer selection

- Mark for review

- Submit test



After submission:



Score

Percentage

Correct

Incorrect

Skipped

Time Taken



Store the complete result.



---



20. Search and Filtering



Admin should be able to search and filter:



- Members

- Questions

- Subjects

- Chapters

- Tests

- PDFs

- Images

- Downloads

- Activity



Use fast search and useful filters.



---



21. Security



Implement proper security.



Requirements:



- Password hashing

- Secure authentication

- Role-based access control

- Protected admin routes

- Protected member routes

- Server-side permission checking

- Input validation

- File type validation

- File size limits

- Secure file storage

- Do not expose private files through predictable public URLs

- Never store plain-text passwords

- Never trust permissions sent from the frontend



IMPORTANT:



All permissions must be verified on the backend/server, not only hidden in the frontend.



---



22. UI/UX



Create a modern educational interface.



Style:



- Clean

- Professional

- Minimal

- Responsive

- Mobile friendly

- Tablet friendly

- Desktop friendly



Use cards, tabs, tables, charts and clean navigation.



Create separate layouts for:



Admin



Sidebar:



Dashboard

Members

Permissions

Questions

AI Generator

Tests

PDFs

Images

Downloads

Activity Logs

Settings

Logout



Member



Sidebar:



Dashboard

Subjects

MCQs

Tests

PDFs

Images

My Performance

My Activity

Logout



---



23. Database



Use a proper relational database.



Create appropriate tables for:



users

roles

permissions

access_packages

subjects

chapters

topics

questions

question_options

question_attempts

tests

test_questions

test_attempts

resources

downloads

activity_logs



Use foreign keys and proper indexes.



---



24. Important Permission Logic



Never rely only on frontend checks.



For example, if a member does not have:



Science → Chapter 3 → View



the backend must reject the request even if the student manually changes the URL.



Similarly, if:



PDF Download = NO



the backend must reject the download request.



---



25. Admin Control



The admin should have complete control over the platform without editing source code.



The admin should be able to:



- Add subjects

- Add chapters

- Add topics

- Add questions

- Generate AI questions

- Approve AI questions

- Upload PDFs

- Upload images

- Create tests

- Create members

- Assign permissions

- View analytics

- Track downloads

- Track activity



---



26. Dashboard Design



Make the dashboard visually impressive but not cluttered.



Use:



- Statistics cards

- Progress bars

- Charts

- Recent activity

- Recent tests

- Weak topics

- Quick actions



The platform should feel like a professional CBSE Class 10 learning management system, not a basic HTML question website.



---



27. Final Requirement



Build the application as a fully functional system, not just a static frontend mockup.



All major buttons, forms, authentication, permissions, question attempts, AI generation workflow, file uploads, downloads, analytics and activity tracking should actually work.



Use clean, modular, maintainable code.



Before finishing, test:



1. Admin login

2. Member login

3. Member permissions

4. Question attempting

5. Correct/incorrect tracking

6. Test submission

7. PDF access

8. PDF download permissions

9. Image access

10. Image download permissions

11. Download tracking

12. Activity logging

13. AI question generation

14. AI draft approval

15. Admin analytics

16. Unauthorized URL/API access



Fix all errors before presenting the final application.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://class10-prep-pro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/96b832a1-9582-4b3c-aeaa-24557d7bab0a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
