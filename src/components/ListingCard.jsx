import { useState } from "react";
import { CATEGORIES } from "../constants/categories";
import { whatsappLink } from "../utils/helpers";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import ImageUpload from "./ImageUpload";
import { checkProfanity } from "../utils/profanity";

export default function ListingCard({
  listing,
  marketplace,
  sellerProfile,
  onMarkSold,
  onUpdate,
  expired,
}) {
  const { profile } = useAuth();
  const isMine = listing.seller_id === profile?.id;
  const cat = CATEGORIES.find((c) => c.name === listing.category);
  const images = listing.listing_images || [];
  const firstImage = images.length > 0 ? images[0].image_url : null;
  const [requested, setRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: listing.name,
    price: listing.price,
    quantity: listing.quantity,
    note: listing.note || "",
    category: listing.category,
  });
  const [editImages, setEditImages] = useState([]);

  const startEditing = () => {
    setEditForm({
      name: listing.name,
      price: listing.price,
      quantity: listing.quantity,
      note: listing.note || "",
      category: listing.category,
    });
    // Load existing images into editable state
    setEditImages(
      images.map((img) => ({ url: img.image_url, preview: img.image_url, existing: true, id: img.id }))
    );
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) return;
    const badWord = checkProfanity(editForm.name, editForm.note);
    if (badWord) {
      alert("Please remove offensive language from your listing.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("listings")
        .update({
          name: editForm.name,
          price: Number(editForm.price) || 0,
          quantity: Number(editForm.quantity) || 1,
          note: editForm.note || null,
          category: editForm.category,
        })
        .eq("id", listing.id);
      if (error) throw error;

      // Delete removed existing images
      const keptIds = editImages.filter((img) => img.existing).map((img) => img.id);
      const removedImages = images.filter((img) => !keptIds.includes(img.id));
      for (const img of removedImages) {
        await supabase.from("listing_images").delete().eq("id", img.id);
      }

      // Update display_order for existing images (to reflect cover choice)
      const keptExisting = editImages.filter((img) => img.existing);
      for (let i = 0; i < keptExisting.length; i++) {
        await supabase.from("listing_images").update({ display_order: i }).eq("id", keptExisting[i].id);
      }

      // Upload new images
      const newImages = editImages.filter((img) => img.file);
      const startOrder = keptExisting.length;
      for (let i = 0; i < newImages.length; i++) {
        const img = newImages[i];
        const path = `${profile.id}/${listing.id}/${Date.now()}_${i}`;
        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(path, img.file, { contentType: img.file.type });
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("listing-images")
            .getPublicUrl(path);
          await supabase.from("listing_images").insert({
            listing_id: listing.id,
            image_url: urlData.publicUrl,
            display_order: startOrder + i,
          });
        }
      }

      if (onUpdate) onUpdate();
      setEditing(false);
    } catch (err) {
      alert("Failed to update listing: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteListing = async () => {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from("listings").delete().eq("id", listing.id);
      if (error) throw error;
      if (onUpdate) onUpdate();
    } catch (err) {
      alert("Failed to delete listing: " + err.message);
    }
  };

  const waLink = sellerProfile
    ? whatsappLink(sellerProfile.whatsapp, listing.name, marketplace.name)
    : "#";

  const handleRequest = async () => {
    if (!profile) return;
    setRequesting(true);
    try {
      const { error } = await supabase.from("buy_requests").insert({
        listing_id: listing.id,
        buyer_id: profile.id,
        message: `Interested in "${listing.name}"`,
      });
      if (error) {
        if (error.code === "23505") {
          alert("You've already requested this item.");
        } else {
          throw error;
        }
      } else {
        setRequested(true);
      }
    } catch (err) {
      alert("Failed to send request: " + err.message);
    } finally {
      setRequesting(false);
    }
  };

  const compact = !marketplace.allow_pictures && !firstImage;

  if (compact) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 transition-all hover:shadow-md p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-xl shrink-0">{cat?.icon || "\uD83D\uDCE6"}</span>
            <div className="min-w-0">
              <h3 className="m-0 text-sm font-semibold truncate">{listing.name}</h3>
              <div className="flex gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
                <span>Qty: {listing.quantity}</span>
                <span>·</span>
                <span>by {sellerProfile?.full_name || "Unknown"}</span>
                <span>·</span>
                <span>{new Date(listing.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {marketplace.pricing_mode !== "free" && listing.price != null ? (
              <span className="font-bold text-green-600">${listing.price}</span>
            ) : (
              marketplace.pricing_mode === "free" && <Badge color="green">FREE</Badge>
            )}
            {!isMine && !expired && !listing.sold && (
              <>
                {requested ? (
                  <Badge color="blue">Requested</Badge>
                ) : (
                  <Button small onClick={handleRequest} disabled={requesting}>
                    {requesting ? "..." : "Request"}
                  </Button>
                )}
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 text-[12px] font-semibold bg-[#25D366] text-white rounded-lg no-underline hover:bg-[#1fb855] transition-colors"
                >
                  Message
                </a>
              </>
            )}
            {isMine && !listing.sold && !expired && (
              <>
                <Button small variant="secondary" onClick={startEditing}>
                  Edit
                </Button>
                <Button small variant="danger" onClick={deleteListing}>
                  Delete
                </Button>
                {onMarkSold && (
                  <Button small variant="success" onClick={() => onMarkSold(listing.id)}>
                    Sold
                  </Button>
                )}
              </>
            )}
            {listing.sold && <Badge color="red">SOLD</Badge>}
          </div>
        </div>
        {listing.note && !editing && (
          <p className="text-gray-500 text-[12px] mt-2 ml-9 leading-relaxed m-0">
            {listing.note}
          </p>
        )}
        {editing && (
          <EditForm
            form={editForm}
            setForm={setEditForm}
            marketplace={marketplace}
            images={editImages}
            onImagesChange={setEditImages}
            saving={saving}
            onSave={saveEdit}
            onCancel={() => setEditing(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-200 transition-all hover:shadow-md">
      {firstImage ? (
        <img
          src={firstImage}
          alt={listing.name}
          className="w-full h-[180px] object-cover bg-gray-100"
        />
      ) : (
        <div className="w-full h-[180px] flex items-center justify-center text-5xl text-gray-300 bg-gray-100">
          📦
        </div>
      )}
      <div className="p-4">
        <div className="flex justify-between items-start">
          <h3 className="m-0 text-base font-semibold">{listing.name}</h3>
          {marketplace.pricing_mode !== "free" && listing.price != null ? (
            <span className="font-bold text-green-600 text-lg">
              ${listing.price}
            </span>
          ) : (
            marketplace.pricing_mode === "free" && (
              <Badge color="green">FREE</Badge>
            )
          )}
        </div>
        <div className="flex gap-2 mt-2 text-xs text-gray-500 flex-wrap">
          <span>Qty: {listing.quantity}</span>
          <span>·</span>
          <span>
            {cat?.icon} {listing.category}
          </span>
          <span>·</span>
          <span>{new Date(listing.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        </div>
        {listing.note && (
          <p className="text-gray-500 text-[13px] mt-2 leading-relaxed">
            {listing.note}
          </p>
        )}
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
          <span className="text-[13px] text-gray-500">
            by <strong>{sellerProfile?.full_name || "Unknown"}</strong>
          </span>
          <div className="flex gap-1.5">
            {!isMine && !expired && !listing.sold && (
              <>
                {requested ? (
                  <Badge color="blue">Requested</Badge>
                ) : (
                  <Button
                    small
                    onClick={handleRequest}
                    disabled={requesting}
                  >
                    {requesting ? "Sending..." : "Request to Buy"}
                  </Button>
                )}
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold bg-[#25D366] text-white rounded-lg no-underline hover:bg-[#1fb855] transition-colors"
                >
                  Message
                </a>
              </>
            )}
            {isMine && !listing.sold && !expired && (
              <>
                <Button small variant="secondary" onClick={startEditing}>
                  Edit
                </Button>
                <Button small variant="danger" onClick={deleteListing}>
                  Delete
                </Button>
                {onMarkSold && (
                  <Button
                    small
                    variant="success"
                    onClick={() => onMarkSold(listing.id)}
                  >
                    Mark as Sold
                  </Button>
                )}
              </>
            )}
            {listing.sold && <Badge color="red">SOLD</Badge>}
          </div>
        </div>
        {editing && (
          <EditForm
            form={editForm}
            setForm={setEditForm}
            marketplace={marketplace}
            images={editImages}
            onImagesChange={setEditImages}
            saving={saving}
            onSave={saveEdit}
            onCancel={() => setEditing(false)}
          />
        )}
      </div>
    </div>
  );
}

function EditForm({ form, setForm, marketplace, images, onImagesChange, saving, onSave, onCancel }) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
      <input
        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#1D4F91] focus:ring-1 focus:ring-[#1D4F91]"
        placeholder="Listing name"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
      />
      <div className="flex gap-2">
        {marketplace.pricing_mode !== "free" && (
          <input
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#1D4F91] focus:ring-1 focus:ring-[#1D4F91]"
            type="number"
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
        )}
        <input
          className="w-20 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#1D4F91] focus:ring-1 focus:ring-[#1D4F91]"
          type="number"
          placeholder="Qty"
          value={form.quantity}
          onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
        />
        <select
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#1D4F91] focus:ring-1 focus:ring-[#1D4F91]"
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
        >
          {CATEGORIES.map((c) => (
            <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <input
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#1D4F91] focus:ring-1 focus:ring-[#1D4F91]"
          placeholder="Note (optional)"
          maxLength={100}
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
        />
        <p className="text-xs text-gray-400 text-right mt-1 m-0">{form.note.length}/100</p>
      </div>
      {marketplace.allow_pictures && (
        <ImageUpload images={images} onChange={onImagesChange} />
      )}
      <div className="flex gap-2">
        <Button small variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button small onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
