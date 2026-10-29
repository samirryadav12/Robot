"use client";

import { useState } from "react";
import Link from "next/link";
import { BomItem } from "@/data/projects";
import { 
  ShoppingCart, 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  HelpCircle, 
  Layers, 
  LayoutGrid, 
  Table as TableIcon,
  Search,
  Check,
  AlertCircle
} from "lucide-react";

interface ProjectBomSectionProps {
  items: BomItem[];
  projectTitle: string;
  projectSlug?: string;
  /* optional link to a 3D model of the project (Line Follower workshop): "Show in 3D", a highlighted entry, thumbnails */
  onLocate?: (id: string) => void;
  highlightId?: string;
  thumbFor?: (id: string) => string | undefined;
}

export function ProjectBomSection({ items = [], projectTitle, projectSlug, onLocate, highlightId, thumbFor }: ProjectBomSectionProps) {
  const availabilityUrl = projectSlug ? `/availability?project=${projectSlug}` : "/availability";
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const categories = ["All", "Electronics", "Movement", "Power", "Structure"] as const;

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.whatIsIt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.whyUsed.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.alternative && item.alternative.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.spec.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const acquiredCount = items.filter((item) => checkedItems[item.id]).length;
  const percentComplete = items.length > 0 ? Math.round((acquiredCount / items.length) * 100) : 0;

  // Calculate estimated total price
  const totalCost = items.reduce((acc, item) => {
    const num = parseInt(item.priceEst.replace(/[^0-9]/g, ""), 10);
    return acc + (isNaN(num) ? 0 : num);
  }, 0);

  return (
    <div className="space-y-8">
      {/* Top Header & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-brand-100 text-brand-800">
              Complete Bill of Materials
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              {items.length} Required Components
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Parts List (BOM)
          </h3>
          <p className="text-slate-600 text-sm mt-1 max-w-2xl">
            Here is every physical component needed to build the <strong>{projectTitle}</strong>. 
            Review what each part does, why you need it, and what safe alternatives you can use if a part is out of stock.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={availabilityUrl}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-sm transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Check Store Availability</span>
          </Link>
          <div className="flex items-center bg-slate-100 rounded-full p-1 border border-[#E8E2D9]">
            <button
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                viewMode === "cards" 
                  ? "bg-white text-slate-900 shadow-xs" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                viewMode === "table" 
                  ? "bg-white text-slate-900 shadow-xs" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Progress & Quick Stats Card */}
      <div className="p-5 rounded-3xl bg-white border border-[#E8E2D9] shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2 flex-1 max-w-xl">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Parts Acquisition Progress</span>
            <span className="text-brand-600 font-extrabold">{acquiredCount} of {items.length} parts ready ({percentComplete}%)</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div 
              className="h-full bg-brand-500 transition-all duration-300 rounded-full"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-6 divide-x divide-slate-100 text-xs">
          <div className="pl-4 first:pl-0">
            <div className="text-slate-500 font-medium">Est. Total Cost</div>
            <div className="text-base font-extrabold text-slate-900">₹{totalCost.toLocaleString("en-IN")}</div>
          </div>
          <div className="pl-4">
            <div className="text-slate-500 font-medium">Hardware Status</div>
            <div className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              100% Solderless Assembly
            </div>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const count = cat === "All" 
              ? items.length 
              : items.filter((i) => i.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:text-slate-900 border border-[#E8E2D9] hover:bg-slate-50"
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search parts, specs, alternatives..."
            className="w-full pl-9 pr-4 py-2 rounded-full bg-white border border-[#E8E2D9] text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      {/* ZERO STATE */}
      {filteredItems.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-[#E8E2D9] p-8 space-y-3">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="font-extrabold text-slate-900 text-base">No components match your search</div>
          <p className="text-slate-500 text-xs max-w-sm mx-auto">
            Try clearing the search query or selecting "All" to view all required parts for this project.
          </p>
          <button
            onClick={() => { setSelectedCategory("All"); setSearchQuery(""); }}
            className="px-4 py-2 rounded-full bg-brand-500 text-white font-bold text-xs"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* VIEW MODE 1: RICH EDITORIAL COMPONENT CARDS */}
      {viewMode === "cards" && filteredItems.length > 0 && (
        <div className="space-y-6">
          {filteredItems.map((item) => {
            const isAcquired = !!checkedItems[item.id];
            return (
              <div
                key={item.id}
                id={`bom-item-${item.id}`}
                className={`bg-white rounded-3xl border transition-all duration-200 p-6 shadow-subtle scroll-mt-24 ${
                  isAcquired
                    ? "border-emerald-300 bg-emerald-50/20"
                    : "border-[#E8E2D9] hover:border-brand-300"
                } ${highlightId === item.id ? "ring-4 ring-brand-200 border-brand-400" : ""}`}
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#E8E2D9]">
                  <div className="flex items-start gap-3.5">
                    {/* Checkbox button */}
                    <button
                      onClick={() => toggleItem(item.id)}
                      className="mt-0.5 text-slate-400 hover:text-brand-600 transition-colors shrink-0"
                      title={isAcquired ? "Mark as unacquired" : "Mark as acquired"}
                    >
                      {isAcquired ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-300 hover:text-slate-400" />
                      )}
                    </button>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Primary Badge */}
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
                          PRIMARY
                        </span>

                        {/* Quantity Badge */}
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-slate-900 text-white flex items-center gap-1">
                          Quantity: {item.qty}
                        </span>

                        {/* Category Badge */}
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {item.category}
                        </span>
                      </div>

                      <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">
                        {item.name}
                      </h4>
                      {onLocate && (
                        <button
                          type="button"
                          onClick={() => onLocate(item.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FBF8F3] border border-[#E8E2D9] text-xs font-bold text-slate-700 hover:border-brand-300 hover:text-brand-700"
                        >
                          <Layers className="w-3.5 h-3.5" /> Show in 3D
                        </button>
                      )}
                    </div>
                    {thumbFor?.(item.id) && (
                      <figure className="hidden sm:block ml-auto shrink-0">
                        <img src={thumbFor(item.id)} alt={`3D render of the ${item.name}`} className="w-24 h-[72px] rounded-2xl border border-[#E8E2D9] bg-[#F7F3EC] object-cover" />
                        <figcaption className="text-[9px] font-semibold text-slate-400 text-center mt-0.5">3D render</figcaption>
                      </figure>
                    )}
                  </div>

                  {/* Price & Stock info */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 pl-9 sm:pl-0">
                    <div className="text-lg font-extrabold text-slate-900">
                      {item.priceEst}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <Link 
                        href={availabilityUrl} 
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                      >
                        In Stock ({item.storesAvailable || 3} stores)
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="pt-4 space-y-4">
                  {/* What it is */}
                  <div className="text-sm text-slate-700 leading-relaxed">
                    <strong className="text-slate-900 font-extrabold">What it is: </strong>
                    {item.whatIsIt}
                  </div>

                  {/* Why you need it */}
                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D9] text-sm text-slate-800 leading-relaxed space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-700">
                      <HelpCircle className="w-4 h-4 text-brand-600 shrink-0" />
                      <span>Why you need it for this robot:</span>
                    </div>
                    <div className="text-slate-700 text-sm pl-5">
                      {item.whyUsed}
                    </div>
                  </div>

                  {/* Key Specification */}
                  <div className="text-xs text-slate-600 flex items-start gap-2 pt-1">
                    <span className="font-extrabold text-slate-800 shrink-0">Key specification:</span>
                    <span className="font-mono text-slate-600">{item.spec}</span>
                  </div>

                  {/* Alternative Section */}
                  {item.alternative ? (
                    <div className="mt-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-200 text-amber-900">
                            ALTERNATIVE
                          </span>
                          <span className="text-sm font-extrabold text-slate-900">
                            {item.alternative.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-amber-800">
                          Compatible replacement
                        </span>
                      </div>

                      {item.alternative.useCase && (
                        <div className="text-xs text-slate-700">
                          <strong className="font-bold text-slate-900">You can use this if: </strong>
                          {item.alternative.useCase}
                        </div>
                      )}

                      <div className="text-xs text-slate-700">
                        <strong className="font-bold text-slate-900">Why this alternative works: </strong>
                        {item.alternative.whyItWorks}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1 text-slate-500">
                      <div>
                        <strong className="font-bold text-slate-700">Alternative: </strong>
                        <span className="italic">No direct alternative listed.</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        This component has specific electrical, structural, or pin requirements.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 2: REFINED COMPARATIVE TABLE */}
      {viewMode === "table" && filteredItems.length > 0 && (
        <div className="bg-white rounded-3xl border border-[#E8E2D9] overflow-hidden shadow-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAF7F2] border-b border-[#E8E2D9] text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-4 w-12 text-center">Have It?</th>
                  <th className="py-4 px-6 min-w-[280px]">Component &amp; Purpose</th>
                  <th className="py-4 px-4 text-center">Qty</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-6 min-w-[260px]">Compatible Alternative</th>
                  <th className="py-4 px-4">Est. Price</th>
                  <th className="py-4 px-6 text-right">Store Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2D9]">
                {filteredItems.map((item) => {
                  const isAcquired = !!checkedItems[item.id];
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-brand-50/40 transition-colors ${isAcquired ? "bg-emerald-50/40" : ""}`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => toggleItem(item.id)}
                          className="text-slate-400 hover:text-brand-600 transition-colors"
                          title={isAcquired ? "Mark as unacquired" : "Mark as acquired"}
                        >
                          {isAcquired ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-300" />
                          )}
                        </button>
                      </td>

                      {/* Component info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
                            PRIMARY
                          </span>
                          <span className="font-extrabold text-slate-900">{item.name}</span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          <strong className="text-slate-800">Why needed:</strong> {item.whyUsed}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {item.spec}
                        </div>
                      </td>

                      {/* Qty */}
                      <td className="py-4 px-4 text-center font-extrabold text-slate-900">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs">
                          {item.qty}x
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 whitespace-nowrap">
                          {item.category}
                        </span>
                      </td>

                      {/* Alternative */}
                      <td className="py-4 px-6">
                        {item.alternative ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800">
                                ALT
                              </span>
                              <span className="font-bold text-slate-900 text-xs">{item.alternative.name}</span>
                            </div>
                            <div className="text-xs text-slate-600">
                              {item.alternative.whyItWorks}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            No direct alternative
                          </span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="py-4 px-4 font-extrabold text-slate-900 whitespace-nowrap">
                        {item.priceEst}
                      </td>

                      {/* Store stock link */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <Link
                          href={availabilityUrl}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>In Stock</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottom Footer Info */}
      <div className="p-6 rounded-3xl bg-[#FAF7F2] border border-[#E8E2D9] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600">
        <div className="space-y-1 text-center md:text-left">
          <div className="font-extrabold text-slate-900 text-sm">Need help ordering these components?</div>
          <p className="text-slate-600 max-w-xl">
            Check real-time stock across vetted Indian robotics suppliers (Robu.in, Quartz Components, Robocraze, Zbotic) with express shipping options.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={availabilityUrl}
            className="px-4 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-sm transition-colors"
          >
            Check Store Availability
          </Link>
          <Link
            href="/components-catalog"
            className="px-4 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-[#E8E2D9] text-slate-800 font-bold text-xs transition-colors"
          >
            Component Library
          </Link>
        </div>
      </div>
    </div>
  );
}
