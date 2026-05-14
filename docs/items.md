# Items

Items live either **on a desk** (item tasks) or in **lockers** (pickups). Inventory is server-authoritative.

## Pickups (lockers)

### Medkit
- Revives a downed teammate.
- **Hold E** next to the body until the revive bar fills.
- Cancels if you move or a teacher catches you.

### Potion
- **Q** to drink.
- ~1.5× speed for **8 seconds**.
- Does not stack — drinking again resets the timer.

### Compass
- Shows an arrow at the top of the screen pointing to the next open task.
- Always active while in your inventory.

### Tracker
- Overlays open tasks (yellow) and items (cyan) on the minimap as dots.
- Always active.

### Thermal goggles
- **F** to activate.
- All teachers are visible as red outlines through walls for 3 seconds.
- 30-second cooldown.

### GPS tracker
- All teachers permanently shown as red dots on the minimap.
- No cooldown, instant while in your inventory.

## Desk items (for tasks)
Picked up with **E** and delivered at the task target. Visible in your hand while carried.

- **Notebook**
- **Calculator**
- **Textbook**
- **Key**
- **Envelope**

Which item is needed right now is shown in the task HUD in the top-left.

## Chair
- Lying around in rooms — no locker needed.
- **E** to pick up.
- **Left click** to throw. Hitting a teacher stuns them for ~3 seconds.
- **G** to drop without throwing.

## Laptops
- Sit on specific desks.
- **E** to sit down.
- Opens a fullscreen mini-app, depending on the laptop:
  - **Casino** (`coinflip`, `dice`, `slots`) — 100% luck.
  - **Teams** (`call`, `dm`, `file`, `rail`) — logic / search.
  - **Moodle** (`course`, `file`, `nav`, `task`) — logic / search.
- The solution sends `gamble_play` to the server; the server validates and marks the task complete.
