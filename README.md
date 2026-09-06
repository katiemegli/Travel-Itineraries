# Bookshelf of Memories

A mobile-friendly, auto-saving travel itinerary board. One column per day, one card per stop, and the way you get between stops drawn as a connector between cards. It is a single file with no build step.

**Open it:** open `index.html` in any browser, or serve the folder from GitHub Pages.

## Adding a card

Press "+ New" at the bottom of a day (or the + in the top bar) and fill in the form:

1. **Place.** Type a name or paste a Google Maps link. A full link fills in the name and saves the pin. With a Google Maps API key, a name also looks up the address and pin. Everything after this is optional.
2. **Category.** Lunch, Dessert/Cafe, Activity, Dinner, or Bar. Editable per trip in settings.
3. **Date and time.** Choosing Lunch fills in 12:00 PM and Dinner fills in 5:30 PM. Both stay editable.
4. **Notes** for each traveler, e.g. Ryan's notes and Katie's notes.
5. **Reservation.** A Booked / Not booked toggle plus a details field.

Submitting creates one card. Cards sort by date, then time. A card without a time takes its category's usual slot, so the order is lunch, dessert/cafe, activity, dinner, bar.

## Travel time between cards

The row between two cards shows how long it takes to get from the card above to the one below. It is computed automatically when both cards have a map pin, from the best source available:

1. **Google Maps directions**, when a Google Maps API key is set. Walking under 35 minutes shows as a walk, otherwise transit under 45 minutes shows as subway, otherwise driving shows as car.
2. **OpenStreetMap routing** (no key needed) when the page can reach the internet. Walking under 35 minutes shows as a walk, otherwise driving shows as car. OpenStreetMap has no transit times, so subway never appears without a Google key.
3. **A straight-line estimate** between the two pins, marked with a tilde, when neither service is reachable. This is what the hosted Claude artifact shows, because it blocks outside requests.

Any row can be overridden by hand from the card's Transportation field.

**Short links.** Google's Share button copies the place name next to a short maps.app.goo.gl link. Paste both together and the name is read from the text. A short link pasted on its own can't be read by a web page, because browsers hide where redirects go. `resolver.gs` is a small Google Apps Script that follows the redirect for you. Deploy it once (instructions are in the file) and paste its URL into trip settings under "Short-link helper URL", and bare short links fill in the name too.

Place names are looked up the same way: Google Places with a key, OpenStreetMap (Nominatim) without one, and a full Google Maps link always saves the name and pin on its own.

The API key is entered in trip settings and stays on that device. Enable the Maps JavaScript, Places (New), Directions and Geocoding APIs for it, and restrict it to your site.

## Hosting

A GitHub Actions workflow deploys the board to GitHub Pages on every push to the default branch. Once Pages is enabled for the repository, the board lives at `https://<owner>.github.io/Travel-Itineraries/`, where Google's script can load and the full workflow above applies.

## Other card properties

Icon, archive (hides the card, with an Archived filter to show them again), rating, city, and outfit are available when you open a card.

## Where changes are saved

- Opened as a plain file or from GitHub Pages, the board saves to the browser's local storage on that device.
- Published as a Claude artifact with the `db` capability, the same file saves to a shared database, so everyone on the trip sees the same board live. That host blocks outside requests, so travel times there are estimates.

## First run

On a device with no saved trips the board loads a London trip transcribed from the original Notion screenshots so the layout is visible right away. Edit or delete it from trip settings.
