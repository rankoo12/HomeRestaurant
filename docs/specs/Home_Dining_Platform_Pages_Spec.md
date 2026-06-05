# Frontend Page Specification: Home-Based Dining Platform

This document outlines the comprehensive page architecture required for the Home-Based Dining Platform. The application is divided into distinct portals for Guests, Chefs (Hosts), and Administrators, along with common public pages and necessary edge-case states.

## 1. Public & Authentication Pages
These pages are accessible to unauthenticated users and form the top of the acquisition funnel.

| Page Name | Expected Route | Core Purpose & Features |
| :--- | :--- | :--- |
| **Landing / Home Page** | `/` | The main storefront. Features a hero section, search bar (location, dates, guests), featured events/chefs, and high-quality visuals. |
| **Login** | `/login` | Authentication portal for existing users (guests, chefs, and admins). Includes JWT/OAuth2 login options and "Forgot Password" link. |
| **Sign Up** | `/signup` | Standard registration form collecting name, email, password, and basic dietary preferences. |
| **Trust & Safety Portal** | `/trust-and-safety` | Informational page outlining cancellation policies, community guidelines, identity verification processes, and hygiene rules. |
| **FAQ / Support** | `/support` | Standard help center addressing common questions for both guests and hosts. |

---

## 2. Guest (End-User) Pages
Pages dedicated to helping users discover, evaluate, and book dining experiences.

| Page Name | Expected Route | Core Purpose & Features |
| :--- | :--- | :--- |
| **Discover / Search Results** | `/events` | Displays list/grid of events with map view integration. Includes advanced filters (price, cuisine, date, dietary tags). |
| **Event Details** | `/events/:eventId` | The primary conversion page. Displays event photos, menu details, chef info, available dates/times, pricing breakdown, and a "Book Now" widget. |
| **Chef Profile** | `/chefs/:chefId` | Showcases host credibility. Includes biography, verified identity badges, gallery, list of upcoming events by this chef, and aggregated guest reviews. |
| **Checkout Flow** | `/checkout/:bookingId` | Multi-step form handling guest count, allergy declarations, and secure payment processing (Stripe integration). |
| **Guest Dashboard** | `/guest/dashboard` | Central hub for the guest. Lists "Upcoming Reservations" and "Past Experiences". |
| **Booking Confirmation** | `/guest/bookings/:id` | Digital receipt and ticket. Includes map/directions to the chef's home, event itinerary, and messaging widget to contact the host. |
| **Review Submission** | `/guest/reviews/new` | Form presented after an event concludes, allowing guests to rate the experience and write a review. |

---

## 3. Chef (Host) Pages
The host portal requires tools for business management, event creation, and guest communication.

| Page Name | Expected Route | Core Purpose & Features |
| :--- | :--- | :--- |
| **Chef Onboarding** | `/host/onboarding` | Multi-step wizard collecting detailed profile info, identity verification documents (KYC), and food safety declarations. |
| **Host Dashboard** | `/host/dashboard` | High-level overview of upcoming hosted events, recent bookings, unread messages, and current monthly earnings. |
| **Event Management** | `/host/events` | A list of the chef's created events. Allows publishing, unpublishing, and duplicating past events. |
| **Event Builder** | `/host/events/create` | Complex form to define event details: title, description, max capacity, pricing, date/time scheduling, and photo uploads. |
| **AI Menu Assistant** | `/host/ai-assistant` | Dedicated tool utilizing Local LLMs to generate appetizing dish descriptions, suggest allergen alternatives, and translate menus. |
| **Guest Management** | `/host/events/:id/guests` | Roster view for a specific event. Shows guest names, dietary restrictions, and payment status. |
| **Earnings & Payouts** | `/host/earnings` | Financial dashboard tracking revenue, platform fees, and managing connected bank accounts (e.g., Stripe Connect). |

---

## 4. Administrator Pages
Secure backend pages for platform operations and content moderation.

| Page Name | Expected Route | Core Purpose & Features |
| :--- | :--- | :--- |
| **Admin Dashboard** | `/admin` | High-level metrics: total active users, platform revenue, new bookings, and system health. |
| **Verification Queue** | `/admin/verifications` | Interface to review and manually approve/reject newly onboarded chefs and their KYC documents. |
| **User Management** | `/admin/users` | Directory of all users with abilities to suspend accounts, reset passwords, or alter roles (RBAC). |
| **Content Moderation** | `/admin/moderation` | Tools to review reported events, flag inappropriate reviews, and oversee platform quality standards. |

---

## 5. Edge Cases & Error Pages
Critical states to handle system errors, user mistakes, and concurrency issues gracefully.

| Page Name / State | Trigger Condition | Core Purpose & Handling Strategy |
| :--- | :--- | :--- |
| **404 Not Found** | Invalid URL or deleted resource | Friendly error page with quick links back to the Discover page or Homepage. |
| **403 Forbidden** | Unauthorized access attempt | Displayed if a Guest tries to access a `/host` or `/admin` route. Prompts login with correct credentials. |
| **Overbooking State** | Concurrency conflict during checkout | If a seat is taken while a user is on the checkout page, abort the transaction, inform the user clearly, and suggest alternative dates for the same chef. |
| **Payment Failed** | Stripe rejection (e.g., insufficient funds) | Keeps the user on the checkout page, highlights the error without losing their inputted data, and prompts for an alternative card. |
| **Empty States** | No search results, no upcoming bookings | Instead of a blank page, provide illustrations and call-to-action buttons (e.g., "Clear filters" or "Browse upcoming events"). |
