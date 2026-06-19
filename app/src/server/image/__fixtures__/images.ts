import type { ImageMimeType } from "../../../shared/contracts";

export const tinyPng = {
  mimeType: "image/png" satisfies ImageMimeType,
  bytes: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAE0lEQVQImWP4z8DwnwGM/zMwAAAf7gP9qS/A4gAAAABJRU5ErkJggg==",
    "base64"
  )
};

export const tinyJpeg = {
  mimeType: "image/jpeg" satisfies ImageMimeType,
  bytes: Buffer.from(
    "/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABgj/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABykX//Z",
    "base64"
  )
};

export const tinyWebp = {
  mimeType: "image/webp" satisfies ImageMimeType,
  bytes: Buffer.from(
    "UklGRjwAAABXRUJQVlA4IDAAAADQAQCdASoCAAIAAUAmJaACdLoB+AADsAD+8ut//NgVzXPv9//S4P0uD9Lg/9KQAAA=",
    "base64"
  )
};

export const corruptImage = {
  mimeType: "image/png" satisfies ImageMimeType,
  bytes: Buffer.from("not-an-image")
};

export const textFile = {
  mimeType: "text/plain",
  bytes: Buffer.from("plain text")
};
