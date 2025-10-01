import React from "react";

type Props = {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
};

export default function Section({ title, children, right }: Props) {
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-950 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}
