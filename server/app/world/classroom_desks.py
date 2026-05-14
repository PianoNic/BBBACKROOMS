"""Student-desk layout templates for classrooms.

Three layouts (rows / pairs / seminar) chosen randomly per room. Each takes
a `Frame` (room-local coords) and returns the desk props with positions
already transformed to world space."""
from __future__ import annotations

from app.schemas.world import Prop
from app.world.frame import Frame


def rows(f: Frame) -> list[Prop]:
    props: list[Prop] = []
    half = f.width / 2 - 0.8
    d = 2.8
    while d <= f.depth - 1.8:
        w = -half
        while w <= half:
            x, z = f.place(d, w)
            props.append(Prop(type="student_desk", x=x, z=z, yaw=f.front_yaw))
            w += 1.5
        d += 1.6
    return props


def pairs(f: Frame) -> list[Prop]:
    props: list[Prop] = []
    half = f.width / 2 - 0.8
    d = 2.8
    while d <= f.depth - 1.8:
        w = -half
        while w + 0.85 <= half:
            for off in (0.0, 0.85):
                x, z = f.place(d, w + off)
                props.append(Prop(type="student_desk", x=x, z=z, yaw=f.front_yaw))
            w += 2.2
        d += 1.7
    return props


def seminar(f: Frame) -> list[Prop]:
    if f.depth < 4.0:
        return rows(f)
    props: list[Prop] = []
    half = f.width / 2 - 0.8
    d = f.depth - 2.2
    w = -half
    while w <= half:
        x, z = f.place(d, w)
        props.append(Prop(type="student_desk", x=x, z=z, yaw=f.front_yaw))
        w += 1.5
    return props


TEMPLATES = (rows, pairs, seminar)
