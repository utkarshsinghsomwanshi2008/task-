# TaskFlow — Task Management System

A complete browser-only task management application built with **HTML, CSS and vanilla JavaScript**. No frameworks, servers, databases, or external libraries are required.

## Run
1. Keep `index.html`, `styles.css`, and `app.js` in the same folder.
2. Open `index.html` in a modern browser.
3. Everything is stored in the browser using `localStorage`.

## Demo login
- **Admin:** `admin@taskflow.app` / `admin123`
- **Manager:** `john@taskflow.app` / `john123`
- **Member:** `maya@taskflow.app` / `maya123`

## Included modules
### User Module
- Dashboard with live stats and daily overview
- Task CRUD with priorities, project, deadline, status, tags and assignee
- Kanban drag-and-drop status updates
- Monthly + weekly calendar with drag-to-reschedule
- Projects with completion percentage and ownership
- Team workload + recent activity
- Notifications + mark read / mark all read
- Focus timer
- Search + filters
- Settings / profile / notification preferences
- JSON summary export

### Admin Module
- User management / remove users
- Project management overview
- Workspace task statistics
- Delivery-health report visualisation
- System notices / notifications

## Local Storage
The application persists users, tasks, projects, notifications, activity, preferences and the current login session in `localStorage`.

> For academic/demo use. Because it is intentionally browser-only, passwords are stored in localStorage and are not suitable for a production authentication system.
