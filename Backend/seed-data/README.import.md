# Compass Import Guide (Users, Companies, Jobs)

Import order (important):
1. users.compass.json
2. companies.compass.json
3. jobs.compass.json

Collections to import into:
- users
- companies
- jobs

Steps in MongoDB Compass:
1. Open database `job_portal`.
2. Open target collection (for example `users`).
3. Click `Add Data` -> `Import JSON or CSV file`.
4. Select matching file from `Backend/seed-data`.
5. Keep import mode as `Insert` and run import.
6. Repeat for other collections in the order above.

Demo credentials from this seed set:

Recruiter accounts (password is same for all):
- Email: riya.recruiter@jobportal.demo
- Email: aman.recruiter@jobportal.demo
- Email: neha.recruiter@jobportal.demo
- Email: karan.recruiter@jobportal.demo
- Password: Recruiter@123
- Role to select on login: Recruiter

Student accounts (password is same for both):
- Email: student1@jobportal.demo
- Email: student2@jobportal.demo
- Password: Student@123
- Role to select on login: Student

Notes:
- Company logos use external logo URLs for UI demo purposes.
- If import fails due to duplicate keys, clear that collection first or delete conflicting docs.
- After import, refresh your app and open Home/Browse/Jobs as Student.
