export type WeddingScheduleItem = Readonly<{
  time: string;
  title: string;
  description: string;
}>;

export type WeddingTravelItem = Readonly<{
  label: string;
  title: string;
  description: string;
}>;

export type WeddingConceptContent = Readonly<{
  couple: string;
  firstNames: readonly [string, string];
  date: string;
  dateShort: string;
  location: string;
  venue: string;
  story: readonly [string, string];
  schedule: readonly WeddingScheduleItem[];
  travel: readonly WeddingTravelItem[];
  rsvpDeadline: string;
}>;

export const weddingContent = {
  couple: "Maya Chen & Julian Brooks",
  firstNames: ["Maya", "Julian"],
  date: "September 20, 2027",
  dateShort: "09.20.27",
  location: "Briar Glen, Hudson Valley",
  venue: "Cedar House",
  story: [
    "Eight years ago, Maya ducked into a tiny record shop to escape a summer storm. Julian was behind the counter, insisting that the best rainy-day album had already been made.",
    "They kept talking long after the clouds cleared. Since then, there have been two cities, one very opinionated rescue dog, and countless Sunday breakfasts. This September, they are gathering everyone they love for their favorite chapter yet.",
  ],
  schedule: [
    {
      time: "3:30 PM",
      title: "Welcome",
      description: "Sparkling drinks and hellos on the north lawn.",
    },
    {
      time: "4:00 PM",
      title: "Ceremony",
      description: "Meet us beneath the old cedar trees.",
    },
    {
      time: "5:00 PM",
      title: "Garden hour",
      description: "Cocktails, small plates, and a little live jazz.",
    },
    {
      time: "6:30 PM",
      title: "Dinner & dancing",
      description: "A long-table supper followed by a very full dance floor.",
    },
  ],
  travel: [
    {
      label: "Stay",
      title: "The Fieldstone Inn",
      description: "A room block is held through August 1. Mention Maya and Julian when booking.",
    },
    {
      label: "Arrive",
      title: "Briar Glen Station",
      description:
        "Weekend trains arrive from the city every two hours. Shuttles meet the 1:10 and 3:10 services.",
    },
    {
      label: "Sunday",
      title: "Orchard brunch",
      description:
        "Join us at Cedar House from 10:30 for coffee, pastries, and one more hug before the trip home.",
    },
  ],
  rsvpDeadline: "August 15, 2027",
} as const satisfies WeddingConceptContent;
