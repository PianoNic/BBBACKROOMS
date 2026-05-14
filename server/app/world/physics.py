"""Gameplay distances. Mirrors client/src/core/constants.ts where relevant."""

# Interaction
LAPTOP_INTERACT_RADIUS = 2.0  # server is slightly more lenient than the visible client prompt

# Teacher AI
TEACHER_SPEED = 3.2           # m/s
TEACHER_CHASE_RADIUS = 16.0   # start chasing within this many world units
TEACHER_ARRIVE_DIST = 1.2     # how close before advancing to the next waypoint
TEACHER_CATCH_RADIUS = 1.2    # teacher kills player at this distance
TEACHER_TICK_HZ = 8
