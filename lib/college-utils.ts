import { colleges } from "@/data/dataSource";

export function getCollegeSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function getCollegeBySlug(slug: string) {
  return colleges.find(
    (c) => getCollegeSlug(c.value) === slug || getCollegeSlug(c.label) === slug
  );
}

export function getCollegeUrl(college: { value: string }): string {
  return `/colleges/${getCollegeSlug(college.value)}`;
}
