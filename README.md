# Neomarc Command

MASTER BUILD PROMPT

NEOMARC DIGITAL OPERATING SYSTEM (NDOS)

AI-Powered Real Estate Sales, CRM, Inventory, Payments, Documentation & Operations Platform

You are an expert full-stack SaaS architect, senior product designer, database engineer, real-estate CRM specialist, financial workflow designer and AI automation engineer.

Your task is to BUILD the first working version of the NEOMARC DIGITAL OPERATING SYSTEM (NDOS).

Do not create a generic CRM.

Build a purpose-designed real estate business operating system for NEOMARC Realty, a Nigerian real estate company involved in:

Land banking

Estate development

Property sales

Property management

Realtor/network sales

Investment products

Customer acquisition

Installment sales

Project development

The system must manage the complete business cycle:

INQUIRY → LEAD → QUALIFICATION → REALTOR ASSIGNMENT → FOLLOW-UP → INSPECTION → PROPERTY/UNIT SELECTION → RESERVATION → PAYMENT PLAN → PAYMENT COLLECTION → DOCUMENTATION → ALLOCATION → CLOSING → AFTER-SALES → REFERRAL

The application must be production-oriented, scalable and modular.

1. CORE TECHNOLOGY ARCHITECTURE

Build the application using:

Lovable frontend

Supabase backend

PostgreSQL database

Supabase Authentication

Row Level Security

Role-based access control

Responsive web application

Mobile-first design

API-ready architecture

Modular component architecture

Do not create fake static screens.

All major forms, tables, dashboards and workflows must connect to the database.

Create proper relational database tables, foreign keys, indexes, validation rules and audit fields.

Every major transaction must have:

created_at

updated_at

created_by

updated_by

status

unique reference number

Use Nigerian Naira (₦) as the default currency.

Use Africa/Lagos timezone.

2. BRANDING

Application name:

NEOMARC DIGITAL OPERATING SYSTEM

Short name:

NDOS

Company:

NEOMARC REALTY

Primary business positioning:

Land Banking | Development | Management | Sales

Brand tagline:

Creating Value, and Sustainable Wealth.

Design direction:

Premium Nigerian real estate technology company.

Use:

clean white background

deep green as major brand colour

gold/orange accent

dark text

premium modern typography

clean cards

spacious dashboard

professional charts

subtle property imagery

mobile responsive layout

Do not make the application look like a generic accounting application.

It should feel like a premium real estate command centre.

3. USER ROLES

Create role-based access.

Roles:

SUPER ADMIN

Full system access.

MANAGEMENT

Access to management dashboards, sales, finance, inventory, reports and operations.

SALES MANAGER

Manage leads, realtors, prospects, inspections and sales pipeline.

REALTOR

Access only to assigned leads, prospects, sales activities, commissions and permitted inventory.

ACCOUNTS/FINANCE

Payments, receipts, outstanding balances, financial reports and commissions.

DOCUMENTATION OFFICER

Customer documents, contracts, deeds, receipts, allocation documentation and document status.

PROJECT MANAGER

Estate/project development, milestones, tasks and project progress.

CUSTOMER

Customer portal showing:

purchased property

payment history

outstanding balance

payment schedule

documents

receipts

allocation information

notifications

Implement proper Row Level Security.

Users must only see information permitted by their role.

4. EXECUTIVE COMMAND CENTRE

Create a premium executive dashboard.

At login, management should immediately see:

Total Leads

New Leads Today

Hot Leads

Active Prospects

Inspections Scheduled

Reservations

Sales This Month

Total Sales Value

Amount Collected

Outstanding Receivables

Overdue Payments

Available Inventory

Reserved Inventory

Sold Inventory

Realtor Sales

Realtor Commissions

Active Projects

Project Progress

Add charts for:

Lead conversion

Sales trend

Collections

Outstanding receivables

Inventory status

Realtor performance

Estate performance

Monthly revenue

Payment defaults

Create a "NEOMARC TODAY" section showing:

overdue payments

leads requiring follow-up

inspections today

pending documentation

pending allocations

reservations expiring

important tasks

5. CRM / LEAD MANAGEMENT

Create a complete CRM.

Lead fields:

Lead ID

Full Name

Phone

WhatsApp

Email

Location

Country

Source

Campaign

Interested Estate

Interested Property

Budget

Preferred Plot Size

Purchase Intent

Lead Temperature

Assigned Realtor

Sales Officer

Date Created

Last Contact

Next Follow-up

Notes

Status

Lead statuses:

New

Contacted

Qualified

Interested

Inspection Scheduled

Inspection Completed

Negotiation

Reservation

Payment Started

Documentation

Allocation

Closed Won

Closed Lost

Nurture

Lead temperature:

Hot

Warm

Cold

Create Kanban and table views.

Every lead should have a complete activity timeline.

Activities:

phone call

WhatsApp

SMS

email

meeting

inspection

follow-up

note

Create automatic follow-up reminders.

6. LEAD SOURCES

Allow configurable lead sources:

WhatsApp

Facebook

Instagram

TikTok

LinkedIn

Website

Realtor Referral

Walk-in

Phone

Event

Existing Customer

Advertisement

Campaign

Other

Track campaign performance.

Management must be able to determine:

Which marketing channel produces the most leads, inspections and actual sales?

7. AI LEAD QUALIFICATION

Create an AI-assisted lead qualification layer.

When a new inquiry enters the system, AI should help classify:

likely budget

preferred location

property type

investment intent

urgency

lead temperature

recommended next action

Do not allow AI to make legally binding promises or financial commitments.

AI should recommend actions to staff.

8. REALTOR MANAGEMENT

Create a dedicated Realtor Management module.

Realtor profile:

Realtor ID

Full Name

Phone

WhatsApp

Email

Location

Registration status

Date joined

Assigned manager

Active/inactive

Total leads

Active prospects

Inspections

Sales

Revenue generated

Commission earned

Commission paid

Outstanding commission

Realtor dashboard:

My Leads

My Prospects

My Inspections

My Reservations

My Sales

My Commission

My Tasks

My Performance

Management can assign/reassign leads.

Record every lead assignment.

Prevent unauthorized access to other realtors' private leads.

9. ESTATE / PROPERTY INVENTORY

Create a centralized property inventory system.

Hierarchy:

Project → Estate → Block/Section → Plot/Unit

Inventory fields:

Estate name

Property ID

Plot number

Plot size

Property type

Location

Title/documentation

Price

Promo price

Status

Assigned customer

Assigned realtor

Reservation date

Sale date

Allocation status

Inventory statuses:

Available

Reserved

Sold

Allocated

On Hold

Blocked

Create a visual inventory map/table.

Use clear status indicators.

Never allow two customers to purchase the same inventory item.

When a reservation is created, inventory automatically changes to RESERVED.

When sale is completed, automatically change to SOLD.

When allocation is completed, automatically change to ALLOCATED.

10. INITIAL ESTATES

Preload the following actual NEOMARC estate information.

RIKA ROYAL GARDEN

Location:

Azumini / Akirika, Ukwa East Local Government Area, Abia State.

Plot size:

464 SQM.

Current sales price:

₦1,200,000 per plot.

Documentation:

Registered Survey

Deed of Assignment

Create it as the primary pilot estate.

Build the inventory structure so that actual plot numbers can be imported later.

Do not invent plot numbers.

EMERALD CITY ESTATE

Location:

Ubakala, Isiala Ngwa Local Government Area, Abia State.

Plot size:

464 SQM.

Current reference price:

₦6,000,000.

Documentation/title:

C of O.

Create the estate but make pricing and inventory fully editable from the administration panel.

11. PAYMENT PLANS

The system must support configurable payment plans.

Do not hard-code payment structures.

Management should be able to create:

outright payment

installment payment

customized payment plan

promotional payment plan

bulk purchase plan

Each payment plan should contain:

total price

initial deposit

balance

interest

number of installments

installment frequency

installment amount

start date

due dates

grace period

penalty rules

payment status

12. RIKA ROYAL GARDEN DEFAULT PAYMENT PLANS

Preload these current payment options.

OPTION 1 — OUTRIGHT PAYMENT

Total:

₦1,200,000

OPTION 2 — 3 MONTHS INTEREST-FREE

Initial deposit:

₦400,000

Month 1:

₦266,700

Month 2:

₦266,700

Month 3:

₦266,600

Total:

₦1,200,000

OPTION 3 — 6 MONTHS

Initial deposit:

₦300,000

Balance:

₦900,000

Interest:

10%

Interest amount:

₦120,000

Total balance:

₦1,020,000

Monthly payment:

₦170,000 × 6 months

Total:

₦1,320,000

The system must automatically generate the payment schedule.

13. SALES MODULE

Create a sales management system.

Sales workflow:

Lead → Qualified → Inspection → Negotiation → Reservation → Payment → Documentation → Allocation → Closed

A sale record must contain:

Sale ID

Customer

Estate

Property/Plot

Realtor

Sales officer

Price

Discount

Payment plan

Deposit

Balance

Total payable

Sale date

Expected completion date

Status

14. RESERVATION SYSTEM

Create a property reservation system.

Reservation fields:

Reservation ID

Customer

Property

Estate

Realtor

Reservation date

Expiry date

Reservation fee

Payment status

Notes

Automatically prevent another customer from reserving the same property.

Allow management to:

approve

extend

cancel

convert reservation into sale

15. PAYMENTS & ACCOUNTS RECEIVABLE

Create a financial module.

Record:

Payment ID

Customer

Sale

Property

Amount

Date

Payment method

Bank/account

Reference

Receipt number

Recorded by

Verification status

Payment methods:

Bank Transfer

Cash

POS

Online Payment

Other

Automatically calculate:

Total Sale Price − Total Verified Payments = Outstanding Balance

Create payment statuses:

Pending

Verified

Reversed

Failed

Only VERIFIED payments should reduce outstanding balances.

16. RECEIPTS

Generate professional NEOMARC payment receipts.

Receipt must include:

NEOMARC logo

company name

receipt number

customer

property

estate

amount paid

payment date

payment method

transaction reference

total paid to date

outstanding balance

authorized officer

disclaimer

Allow PDF generation and printing.

17. DOCUMENT MANAGEMENT

Create a secure document management system.

Documents may include:

Application Form

Payment Receipt

Contract of Sale

Deed of Assignment

Registered Survey

Allocation Letter

Offer Letter

Identification documents

Customer correspondence

Other property documents

Document fields:

Document ID

Customer

Estate

Property

Document type

Upload

Version

Status

Date issued

Expiry date

Uploaded by

Use secure storage.

Do not expose sensitive customer documents to unauthorized users.

18. CUSTOMER PORTAL

Create a customer login portal.

Customer should see:

MY PROPERTY

Estate

Plot/Unit

Size

Purchase price

Status

MY PAYMENTS

Total paid

Balance

Payment history

Upcoming payment

Overdue amount

MY DOCUMENTS

Secure document downloads.

MY RECEIPTS

All receipts.

MY ALLOCATION

Allocation details when available.

19. INSPECTION MANAGEMENT

Create an inspection module.

Fields:

Inspection ID

Lead/customer

Estate

Date

Time

Realtor

Driver/escort

Number of attendees

Status

Outcome

Notes

Follow-up date

Statuses:

Scheduled

Confirmed

Completed

Rescheduled

Cancelled

No Show

After inspection, automatically prompt the assigned realtor to record outcome and next action.

20. TASK MANAGEMENT

Create tasks for:

follow-ups

inspections

payment reminders

documentation

allocation

customer service

marketing

project development

Task fields:

Task

Assigned person

Priority

Due date

Related lead

Related customer

Related sale

Status

Statuses:

To Do

In Progress

Completed

Overdue

21. AUTOMATED FOLLOW-UP ENGINE

Create automation rules.

Examples:

New lead:

→ immediate acknowledgement

No response:

→ follow-up reminder

Inspection scheduled:

→ confirmation

Inspection completed:

→ follow-up task

Reservation approaching expiry:

→ notification

Payment approaching:

→ reminder

Payment overdue:

→ escalation

Sale completed:

→ documentation task

Documentation completed:

→ allocation task

Allocation completed:

→ after-sales follow-up

Allow management to edit automation rules.

22. WHATSAPP / MESSAGING ARCHITECTURE

Build the system so it is API-ready for WhatsApp Business integration.

Create message templates:

NEW INQUIRY

Thank you for contacting NEOMARC Realty.

INSPECTION CONFIRMATION

PAYMENT REMINDER

PAYMENT RECEIPT

RESERVATION CONFIRMATION

DOCUMENTATION UPDATE

ALLOCATION NOTIFICATION

AFTER-SALES MESSAGE

Do not fake WhatsApp integration.

Create the integration architecture and configuration interface so official WhatsApp Business API credentials can be connected later.

23. EMAIL

Create email notification architecture.

Support:

lead acknowledgement

payment confirmation

receipt delivery

document notification

payment reminders

reservation notifications

management alerts

Keep provider configuration separate from application logic.

24. COMMISSION SYSTEM

Create a configurable commission engine.

Commission should be linked to:

realtor

sale

estate

property

sale value

commission percentage

commission amount

approval

payment

Statuses:

Pending

Approved

Paid

Cancelled

Do not hard-code commission percentages.

Allow management to configure them.

25. PROJECT MANAGEMENT

Create project/development management.

Project fields:

Project name

Location

Project type

Land size

Start date

Target completion

Budget

Actual cost

Status

Project manager

Create:

milestones

tasks

contractors

expenses

progress

documents

notes

The architecture must support future development projects.

26. EXPENSE MANAGEMENT

Create expense tracking.

Fields:

Expense ID

Project

Estate

Category

Amount

Date

Vendor

Payment method

Receipt/document

Approved by

Status

Expense categories should be configurable.

27. MANAGEMENT REPORTS

Create reports for:

SALES

Sales by estate

Sales by realtor

Sales by month

Sales by property

Sales by payment plan

COLLECTIONS

Total collected

Outstanding

Overdue

Collection rate

INVENTORY

Available

Reserved

Sold

Allocated

CRM

Leads

Conversion

Sources

Realtor performance

FINANCE

Revenue

Expenses

Receivables

Commissions

Allow date filters.

Allow export to CSV/Excel/PDF where practical.

28. AI CHIEF OF STAFF

Create an AI management assistant called:

NEOMARC AI CHIEF OF STAFF

It should answer questions based on the NDOS database.

Examples:

"How much did we collect this month?"

"Which customers are overdue?"

"Which realtor generated the most sales?"

"Which estate has the highest sales?"

"How many plots are still available?"

"Which leads have not been contacted?"

"What requires my attention today?"

"Which payment plans are falling behind?"

"Show me sales performance for RIKA ROYAL GARDEN."

"Give me today's management briefing."

The AI should provide concise business intelligence and recommended actions.

It must never fabricate database information.

If data is unavailable, explicitly say so.

29. MANAGEMENT DAILY BRIEFING

Create an automated daily briefing.

Display:

TODAY'S NEOMARC BRIEFING

New leads

Hot leads

Follow-ups

Inspections

Payments due

Payments overdue

Reservations expiring

Pending documents

Pending allocations

Sales

Collections

Important tasks

Add a button:

GENERATE AI MANAGEMENT BRIEFING

30. AUDIT TRAIL

Every important action must be logged.

Track:

user

action

record

timestamp

previous value

new value

Especially:

payment changes

sale changes

inventory status

customer information

reservation changes

commission changes

document changes

Management should have an Audit Log screen.

31. GLOBAL SEARCH

Create powerful global search.

Search across:

leads

customers

realtors

properties

estates

sales

payments

receipts

documents

Search by:

name

phone

email

property number

transaction ID

receipt number

32. NOTIFICATION CENTRE

Create notification centre.

Notification types:

New lead

Assigned lead

New payment

Payment overdue

Reservation expiring

Inspection

New sale

Documentation pending

Allocation pending

Task overdue

Commission approved

33. ADMIN SETTINGS

Create an administration panel.

Management can configure:

company information

estates

properties

prices

payment plans

commission rules

users

roles

lead sources

pipeline stages

document types

expense categories

notification templates

automation rules

Do not require a developer for ordinary configuration.

34. DATA IMPORT / EXPORT

Create import tools for:

existing customers

leads

realtors

inventory

payments

sales

Allow CSV upload.

Include validation before importing.

Show errors clearly.

Also provide export functionality.

35. SECURITY

Security is critical.

Implement:

Supabase authentication

Row Level Security

role-based permissions

secure file storage

protected customer documents

audit logs

server-side validation

database constraints

duplicate prevention

transaction integrity

Never expose secret API keys in frontend code.

Never store sensitive credentials in plain text.

36. DATABASE DESIGN

Create normalized relational tables including, at minimum:

users roles user_roles leads lead_activities lead_sources realtors realtor_assignments customers projects estates properties reservations sales payment_plans payment_schedule payments receipts documents inspections tasks commissions expenses project_milestones notifications message_templates automation_rules audit_logs system_settings

Use appropriate relationships and foreign keys.

37. USER EXPERIENCE

The application must be extremely easy to use.

Navigation:

Dashboard CRM Leads Customers Realtors Estates Inventory Inspections Sales Reservations Payments Receivables Documents Commissions Projects Expenses Tasks Reports AI Chief of Staff Notifications Settings

Use collapsible sidebar navigation.

Use responsive mobile layouts.

Use dashboard cards and clean tables.

Use confirmation dialogs before destructive actions.

38. MVP PRIORITY

Do not attempt to perfect every advanced integration before the core system works.

Build in this priority:

PHASE 1

Authentication Dashboard Database Roles CRM Realtors Estates Inventory Customers

PHASE 2

Sales Reservations Payment plans Payments Receipts Receivables

PHASE 3

Documents Inspections Tasks Commission

PHASE 4

Reports Notifications Automation

PHASE 5

WhatsApp/API integration Email integration Customer portal

PHASE 6

AI Chief of Staff Advanced analytics AI lead qualification

39. CRITICAL BUSINESS RULES

Implement these rules:

A property cannot be simultaneously reserved by two customers.

A sold property cannot become available unless an authorized management user reverses the transaction.

Only verified payments reduce customer outstanding balances.

Every sale must have a customer and property.

Every payment must be linked to a customer and preferably a sale.

Every commission must be linked to a sale.

Every realtor must have controlled access to assigned leads.

Customer documents must be protected.

All financial changes must be auditable.

Do not delete financial transactions permanently. Use reversal/void status.

Do not allow negative balances unless explicitly authorized.

Payment schedules must automatically recalculate outstanding balances.

Estate inventory must support future estates without changing the database structure.

Prices must be configurable.

Payment plans must be configurable.

40. FIRST-PHASE DEMO DATA

Create only legitimate seed data necessary to demonstrate the application.

Use:

RIKA ROYAL GARDEN

as the main demo estate.

Use:

EMERALD CITY ESTATE

as the second estate.

Do not invent customer financial information.

Do not invent actual sales.

Where inventory numbers are required for demonstration, clearly label them as:

DEMO INVENTORY

and make them easy to delete/import.

41. ADMIN EXPERIENCE

The Super Admin must be able to run the company from the dashboard without technical knowledge.

For example:

To add a new estate:

Settings → Estates → Add Estate

To add plots:

Estate → Inventory → Import Inventory

To create a payment plan:

Settings → Payment Plans → New Plan

To create a realtor:

Realtors → Add Realtor

To record a payment:

Customer → Sale → Record Payment

To generate a receipt:

Payment → Generate Receipt

To allocate property:

Sale → Allocation → Allocate

42. REAL ESTATE SALES PIPELINE

Create visual pipeline:

NEW LEAD ↓ CONTACTED ↓ QUALIFIED ↓ INTERESTED ↓ INSPECTION ↓ NEGOTIATION ↓ RESERVATION ↓ PAYMENT ↓ DOCUMENTATION ↓ ALLOCATION ↓ CLOSED

Allow drag-and-drop where safe.

Every stage change must be recorded in the activity/audit history.

43. INVENTORY DASHBOARD

Create visual estate inventory summary.

Example:

RIKA ROYAL GARDEN

Total Inventory Available Reserved Sold Allocated

Include:

total potential sales value

sold value

collected value

outstanding value

Make the figures automatically calculate from database records.

44. PAYMENT DASHBOARD

Show:

Total Contract Value Total Collected Total Outstanding Total Overdue Due This Week Due This Month Collection Rate

Add customer-level receivable ageing:

Current

1–30 days

31–60 days

61–90 days

90+ days

45. MOBILE-FIRST REAL ESTATE EXPERIENCE

Realtors will frequently use mobile phones.

Optimize the mobile experience for:

lead capture

calling

WhatsApp

follow-up

property lookup

inspection

reservation

payment status

customer information

Make key actions accessible with minimal taps.

46. AI DEVELOPMENT BEHAVIOUR

You are not merely generating UI.

You are building a real business application.

Before implementing each major module:

Check the existing database structure.

Reuse existing tables/components where appropriate.

Avoid duplicate data models.

Maintain relationships.

Maintain security.

Maintain responsive design.

Test critical workflows.

Do not break existing modules.

Do not replace working functionality unnecessarily.

Do not create fake buttons that do nothing.

Where an external API is not connected, create a clearly labelled integration-ready interface rather than pretending it works.

47. ACCEPTANCE TEST

The initial application will be considered successful when management can perform this complete workflow:

Create a lead.

Assign the lead to a realtor.

Convert the lead to a customer.

Schedule an inspection.

Select an available RIKA ROYAL GARDEN plot.

Create a reservation.

Select the 3-month payment plan.

Record the ₦400,000 initial deposit.

Automatically calculate the remaining payment schedule.

Generate a receipt.

Show the customer's outstanding balance.

Track subsequent payments.

Complete documentation.

Allocate the property.

Calculate realtor commission.

Close the sale.

Show the transaction on the management dashboard.

Allow the customer to see their property, payments and documents.

Allow management to ask the AI Chief of Staff for a summary of the transaction.

Record all important actions in the audit log.

48. IMPORTANT: BUILD ORDER

START BUILDING NOW.

Do not respond with a theoretical explanation.

Do not simply generate a static prototype.

First create the database architecture and authentication.

Then build:

Executive Dashboard

CRM

Realtor Management

Estates

Inventory

Customers

Sales

Reservations

Payment Plans

Payments

Receipts

Documents

Inspections

Tasks

Commissions

Reports

Notifications

AI Chief of Staff

Use realistic sample data where necessary but clearly label all sample records.

At every stage, keep the application deployable.

Prioritize working business functionality over decorative UI.

The final objective is:

ONE DIGITAL COMMAND CENTRE FOR NEOMARC REALTY

From:

FIRST INQUIRY

to:

FINAL CLOSING

and beyond.

Build the foundation now.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://neomarc-nexus.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/21f2fb49-a5cf-4ee3-8a3c-b2ef690f0ac3).

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
