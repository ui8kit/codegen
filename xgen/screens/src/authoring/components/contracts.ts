// Contracts for what moves: a marquee, a carousel, a counter that counts up, typed text, a video, an animated backdrop, a scroll spy, a draggable list.
// A contract fixes the props, the slots and the events and says why it is not generated. The static look of each is a variant of a block
// (a strip, a single quote with dots, plain figures, a code window, a picture, a flat accent hero); the motion is written by the programmer behind the contract.
import { contract, prop, req, ts } from "../kit";
import type { OrganismSpec } from "../../ir";

const P = "pattern.";
const MOTION = "motion needs timers, animation frames or media APIs and a reduced-motion rule; it is written by the programmer behind this contract";

const marquee = contract(`${P}marquee`, "Marquee", "A row (or column) of items that scrolls on its own and pauses on hover and focus. The items are the children; the same items follow once more, hidden from assistive technology, so the loop has no gap.", MOTION, {
  props: [req("label", "string", "accessible name of the region"), prop("direction", ts('"start" | "end"'), "which way the items move", { default: "start" }), prop("paused", "boolean", "stop the motion; also the value under a reduced-motion preference")],
  className: true,
  children: true,
});

const carousel = contract(`${P}carousel`, "Carousel", "Slides shown one at a time with previous and next buttons and dots. The slides are the children. The page keeps the index in `value` and learns of a change from `change`; autoplay is off unless the programmer turns it on, and a reduced-motion preference turns it off.", MOTION, {
  props: [req("label", "string", "accessible name of the region"), req("count", "number", "how many slides"), prop("value", "number", "index of the slide shown", { default: 0 }), prop("previous", "string", "accessible name of the previous button"), prop("next", "string", "accessible name of the next button")],
  className: true,
  children: true,
  events: [{ name: "change", args: [{ name: "index", type: "number" }], docs: "a button or a dot moved to another slide" }],
});

const countUp = contract(`${P}count-up`, "CountUp", "A figure that counts from zero to `value` when it first comes into view. Without script, and under a reduced-motion preference, it shows `value` at once; the figure in the markup is always the final one.", MOTION, {
  props: [req("value", "number", "the final figure"), prop("prefix", "string"), prop("suffix", "string"), prop("duration", "number", "milliseconds", { default: 1200 })],
  className: true,
});

const typingText = contract(`${P}typing-text`, "TypingText", "A line typed one character at a time, then erased, then the next line. Assistive technology and a reduced-motion preference get the first line, whole.", MOTION, {
  props: [req("lines", ts("string[]"), "the lines in turn"), prop("speed", "number", "milliseconds per character", { default: 60 })],
  className: true,
});

const videoEmbed = contract(`${P}video-embed`, "VideoEmbed", "A video in a fixed ratio with a poster, controls and, as a backdrop, a muted loop behind the content. Playing starts only on request; a backdrop video stops under a reduced-motion preference and shows the poster.", MOTION, {
  props: [req("title", "string", "accessible name of the player"), req("poster", "string", "address of the poster picture"), prop("src", "string", "address of the video"), prop("ratio", ts('"16/9" | "4/3" | "1/1"'), "frame ratio", { default: "16/9" }), prop("backdrop", "boolean", "muted, looping, without controls, behind the content", { default: false })],
  className: true,
  events: [{ name: "play", args: [], docs: "playing started" }, { name: "pause", args: [], docs: "playing stopped" }],
});

const animatedBackdrop = contract(`${P}animated-backdrop`, "AnimatedBackdrop", "A moving background behind a section (drifting shapes, a mesh of soft colour). The static fallback is a flat tone of the theme; nothing moves under a reduced-motion preference.", MOTION, {
  props: [prop("tone", ts('"default" | "muted" | "accent"'), "the flat colour shown without motion", { default: "default" })],
  className: true,
  children: true,
});

const scrollSpy = contract(`${P}scroll-spy`, "ScrollSpy", "Marks which section of the page is being read: it watches the sections by id and reports the one in view, so a table of contents or a sticky picture can follow.", "an intersection observer on the page's sections; the page owns the state", {
  props: [req("ids", ts("string[]"), "ids of the sections, in page order"), prop("offset", "number", "pixels from the top that count as being in view", { default: 0 })],
  events: [{ name: "active", args: [{ name: "id", type: "string" }], docs: "another section came into view" }],
});

const sortableList = contract(`${P}sortable-list`, "SortableList", "Items that can be dragged into a new order or into another list (the cards of a board). Keyboard users move an item with the arrow keys; the new place is reported, nothing is stored here.", "drag and drop with pointer capture and a keyboard alternative; the order is kept by the page", {
  props: [req("label", "string", "accessible name of the list"), req("group", "string", "lists with the same group accept each other's items")],
  className: true,
  children: true,
  events: [{ name: "move", args: [{ name: "id", type: "string" }, { name: "to", type: "string" }, { name: "index", type: "number" }], docs: "an item was dropped" }],
});

export const contractPatterns: OrganismSpec[] = [marquee, carousel, countUp, typingText, videoEmbed, animatedBackdrop, scrollSpy, sortableList];
