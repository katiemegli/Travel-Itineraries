# Bookshelf of Memories

A mobile-friendly, auto-saving travel itinerary board. One column per day, one card per stop, and the way you get between stops drawn as a connector between cards. It is a single file with no build step.

**Open it:** open `index.html` in any browser, or serve the folder from GitHub Pages.

## What a card holds

Every card carries the same properties as the Notion database it replaces:

| Property | Notes |
| --- | --- |
| Icon + title | Any emoji, picked from a grid or pasted |
| Category | Food, Drinks, Sights, Activity, Hotel, Transit, Shopping, Rest. Editable per trip |
| Reservation | Free text with quick picks such as "Booked" or "Need to book" |
| Archive | Hides the card from the board. An "Archived" filter shows them again |
| Notes per traveler | One field per traveler on the trip, e.g. Ryan's notes and Katie's notes |
| Rating | One to five stars |
| Date | Moves the card between day columns. A new date adds a day to the trip |
| Time | Cards sort by time within a day |
| Transportation | Minutes plus mode (walk, subway, bus, tram, train, taxi, drive, tuk-tuk, bike, ferry, flight). Shown as the connector above the card |
| City | Suggested from the trip's city list |
| Outfit | Free text |

## Using the board

- Tap a card to edit it. Every keystroke is saved automatically.
- Drag the grip on a card to another day, or change its Date in the editor.
- The "Unscheduled" column holds ideas without a day yet.
- Use "…" on a day header to add a day before or after, or remove the day.
- The trip name opens the trip switcher and trip settings, where you edit travelers, cities, and categories.
- Category chips under the title filter the board.

## Where changes are saved

- Opened as a plain file or from GitHub Pages, the board saves to the browser's local storage on that device.
- Published as a Claude artifact with the `db` capability, the same file saves to a shared database, so everyone on the trip sees the same board live.

## First run

On a device with no saved trips the board loads a London trip transcribed from the original Notion screenshots so the layout is visible right away. Edit or delete it from trip settings.
