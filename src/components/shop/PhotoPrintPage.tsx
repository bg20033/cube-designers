import { useMemo, useRef, useState, type DragEvent } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Crop,
  Frame,
  ImageUp,
  RectangleHorizontal,
  RectangleVertical,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  ZoomIn,
} from "lucide-react"
import { addCartItem, getSelection, sanitizeCart } from "@/data/commerce"
import {
  customSizeId,
  getFinish,
  getPosterSize,
  parseVariantId,
  photoProduct,
  variantIdFor,
  type PhotoSpec,
} from "@/data/products"
import { readStoredJson, writeStoredJson } from "./persistence"
import { PhotoCropper, type CropView } from "@/components/store/PhotoCropper"
import { SizeFinishPicker } from "@/components/store/SizeFinishPicker"
import { PrintSurface, finishedSize } from "@/components/store/PrintSurface"
import { StoreShell } from "@/components/store/StoreChrome"
import { usePhotoUpload } from "@/components/store/usePhotoUpload"
import { cropFor, photoDpi, qualityLabel } from "@/lib/photo-upload"
import { WALL_INCOMING_KEY } from "./wall-layout"
import { PhotoRoomPreview } from "./PhotoRoomPreview"
import { CustomPhotoSize } from "./CustomPhotoSize"
import { sizeForPhoto } from "./photo-size"
import "@/components/store/compact-controls.css"
import "./photo.css"
import "./photo-preview.css"

const CART_KEY = "cube-shop-cart-v1"
const CENTRED: CropView = { zoom: 1, cx: 0.5, cy: 0.5 }
const STEPS = ["Fotoja", "Formati", "Përmbledhja"]
type Preview = "room" | "crop" | "detail"

export default function PhotoPrintPage() {
  const { enabled, draft, select, reset } = usePhotoUpload()
  const [variantId, setVariantId] = useState(photoProduct.defaultVariantId!)
  const [landscape, setLandscape] = useState(false)
  const [sizeMode, setSizeMode] = useState<"standard" | "custom" | "photo">(
    "standard",
  )
  const [ratioLocked, setRatioLocked] = useState(false)
  const [sizeValid, setSizeValid] = useState(true)
  const [view, setView] = useState<CropView>(CENTRED)
  const [step, setStep] = useState(0)
  const [preview, setPreview] = useState<Preview>("room")
  const [error, setError] = useState("")
  const [added, setAdded] = useState(false)
  const [cartCount, setCartCount] = useState<number>()
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const choice = useRef(0)
  const parsed = parseVariantId(variantId)!
  const size = getPosterSize(parsed.size)!
  const finish = getFinish(parsed.finish)!
  const dims = landscape ? ([size.cm[1], size.cm[0]] as const) : size.cm
  const outer = finishedSize(dims, parsed.finish)
  const aspect = dims[0] / dims[1]
  const crop = useMemo(
    () =>
      draft ? cropFor(draft, aspect, view.zoom, view.cx, view.cy) : undefined,
    [draft, aspect, view],
  )
  const photo = draft && crop ? { src: draft.localSrc, crop } : undefined
  const selection = getSelection(photoProduct, variantId)
  const dpi = draft && crop ? photoDpi(draft, crop, dims[0]) : 0
  const quality = qualityLabel(dpi)
  const ready = draft?.status === "done" && dpi >= 70 && sizeValid
  const sourceAspect = draft ? draft.width / draft.height : undefined
  const nativeSize = sourceAspect
    ? sizeForPhoto(sourceAspect, Math.max(...dims))
    : undefined

  function changeDimensions(next: [number, number]) {
    const id = customSizeId(...next)
    if (!id) return
    setVariantId(variantIdFor(id, parsed.finish))
    setLandscape(next[0] > next[1])
    setAdded(false)
    setSizeValid(true)
  }
  function selectSizeMode(mode: "standard" | "custom" | "photo") {
    if (mode === sizeMode) return
    if (mode === "photo") {
      if (!nativeSize) return
      changeDimensions(nativeSize)
      setRatioLocked(true)
      setView(CENTRED)
    } else if (mode === "custom") {
      changeDimensions([...dims])
      setRatioLocked(false)
    } else {
      setVariantId(variantIdFor("30x40", parsed.finish))
      setRatioLocked(false)
    }
    setSizeMode(mode)
    setSizeValid(true)
    setAdded(false)
  }

  function goTo(next: number) {
    if (next === 2 && !sizeValid) return
    setStep(next)
    if (next > 0) setPreview("room")
    panel.current?.scrollTo({ top: 0, behavior: "instant" })
  }
  function changeView(next: CropView) {
    setView(next)
    setAdded(false)
  }
  function orient(next: boolean) {
    if (sizeMode !== "standard") {
      setSizeMode("custom")
      setRatioLocked(false)
    }
    setLandscape(next)
    setAdded(false)
  }
  async function choose(file?: File) {
    if (!file) return
    const request = ++choice.current
    setError("")
    try {
      const picked = await select(file, { waitForUpload: false })
      if (!picked || request !== choice.current) return
      setAdded(false)
      setView(CENTRED)
      if (sizeMode === "standard") setLandscape(picked.width > picked.height)
      if (sizeMode === "photo") {
        const next = sizeForPhoto(
          picked.width / picked.height,
          Math.max(...dims),
        )
        if (next) changeDimensions(next)
        else {
          setSizeMode("custom")
          setRatioLocked(false)
        }
      }
      setPreview("crop")
      goTo(0)
    } catch (problem) {
      if (request === choice.current)
        setError(
          problem instanceof Error
            ? problem.message
            : "Kjo foto nuk mund të lexohet. Provo JPG ose PNG.",
        )
    }
  }
  function drop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setDragging(false)
    void choose(event.dataTransfer.files[0])
  }
  function spec(): PhotoSpec | undefined {
    if (!draft?.uploaded || !crop) return undefined
    return {
      image: draft.uploaded.image,
      original: draft.uploaded.original,
      crop,
      ...(landscape ? { landscape: true } : {}),
      name: draft.name.slice(0, 80),
    }
  }
  function addToCart() {
    const photo = spec()
    if (!ready || !photo || added) return
    const cart = addCartItem(
      sanitizeCart(readStoredJson(CART_KEY, [])),
      photoProduct,
      variantId,
      photo,
    )
    writeStoredJson(CART_KEY, cart)
    if (JSON.stringify(readStoredJson(CART_KEY, [])) !== JSON.stringify(cart)) {
      setError(
        "Shporta nuk u ruajt. Lejo ruajtjen në shfletues dhe provo përsëri.",
      )
      return
    }
    setCartCount(cart.reduce((total, item) => total + item.quantity, 0))
    setAdded(true)
  }
  function sendToWall() {
    const photo = spec()
    if (!ready || !photo) return
    const incoming = { variant: variantId, photo }
    writeStoredJson(WALL_INCOMING_KEY, incoming)
    if (
      JSON.stringify(readStoredJson(WALL_INCOMING_KEY, null)) !==
      JSON.stringify(incoming)
    ) {
      setError(
        "Fotoja nuk u ruajt. Lejo ruajtjen në shfletues dhe provo përsëri.",
      )
      return
    }
    window.location.href = "/shop/muri"
  }

  return (
    <StoreShell className="photo-page" count={cartCount}>
      <main id="main-content" className="photo-main">
        <h1 className="sr-only">Printo foton tënde.</h1>
        <div className="photo-workspace">
          <section
            className={`photo-editor preview-${preview}${dragging ? " is-dragging" : ""}`}
            aria-label="Pamja e printit"
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node))
                setDragging(false)
            }}
            onDrop={drop}
          >
            <div className="photo-preview-bar">
              <div
                className="photo-preview-modes"
                role="group"
                aria-label="Pamja paraprake"
              >
                <button
                  type="button"
                  aria-pressed={preview === "room"}
                  onClick={() => setPreview("room")}
                >
                  <Frame /> Në ambient
                </button>
                <button
                  type="button"
                  aria-pressed={preview === "detail"}
                  onClick={() => setPreview("detail")}
                >
                  <ZoomIn /> Detaji
                </button>
                <button
                  type="button"
                  disabled={!draft}
                  aria-pressed={preview === "crop"}
                  onClick={() => setPreview("crop")}
                >
                  <Crop /> Prerja
                </button>
              </div>
            </div>
            <div className="photo-preview-body">
              {preview === "crop" && draft && crop ? (
                <PhotoCropper
                  src={draft.localSrc}
                  aspect={aspect}
                  crop={crop}
                  view={view}
                  onView={changeView}
                />
              ) : (
                <PhotoRoomPreview
                  dims={dims}
                  finish={parsed.finish}
                  photo={photo}
                  detail={preview === "detail"}
                />
              )}
            </div>
            <div className="photo-preview-info">
              <span>
                {dims[0]} × {dims[1]} cm <i>·</i> {finish.label}
              </span>
              {preview === "crop" && <span>Tërhiq për ta pozicionuar.</span>}
            </div>
            {dragging && (
              <div className="photo-drop-overlay">
                <ImageUp />
                <strong>Lësho foton këtu</strong>
              </div>
            )}
          </section>
          <aside
            className="photo-panel"
            data-step={step}
            aria-label="Konfigurimi i fotos"
          >
            <div
              className="photo-steps"
              role="tablist"
              aria-label="Hapat e printimit"
            >
              {STEPS.map((label, index) => (
                <button
                  key={label}
                  id={`photo-step-${index}`}
                  role="tab"
                  aria-selected={step === index}
                  aria-controls="photo-step-content"
                  type="button"
                  disabled={index === 2 && !sizeValid}
                  onClick={() => goTo(index)}
                  onKeyDown={(event) => {
                    if (
                      ["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                        event.key,
                      )
                    ) {
                      event.preventDefault()
                      const next =
                        event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? 2
                            : (index + (event.key === "ArrowRight" ? 1 : 2)) % 3
                      goTo(next)
                      document.getElementById(`photo-step-${next}`)?.focus()
                    }
                  }}
                  tabIndex={step === index ? 0 : -1}
                >
                  <span>{index < step ? <Check /> : index + 1}</span>
                  {label}
                </button>
              ))}
            </div>
            <div
              ref={panel}
              id="photo-step-content"
              className="photo-panel-content"
              role="tabpanel"
              aria-labelledby={`photo-step-${step}`}
              tabIndex={0}
            >
              {step === 0 && (
                <>
                  <button
                    className={`photo-drop${draft ? " has-photo" : ""}`}
                    type="button"
                    onClick={() => input.current?.click()}
                  >
                    {photo ? (
                      <>
                        <span
                          className="photo-upload-thumbnail"
                          style={{ backgroundImage: `url("${photo.src}")` }}
                        />
                        <span>
                          <strong>{draft!.name}</strong>
                          <small>
                            {draft!.width} × {draft!.height} px · Ndrysho foton
                          </small>
                        </span>
                        <ImageUp />
                      </>
                    ) : (
                      <>
                        <ImageUp />
                        <strong>Zgjidh një foto</strong>
                        <span>ose tërhiqe në pamjen e printit</span>
                        <small>JPG, PNG, WebP · deri 40 MB · min. 400 px</small>
                      </>
                    )}
                  </button>
                  {draft && (
                    <>
                      <div className="photo-control-label">
                        Orientimi i printit
                      </div>
                      <div
                        className="photo-orientation"
                        role="group"
                        aria-label="Orientimi"
                      >
                        <button
                          type="button"
                          aria-pressed={!landscape}
                          onClick={() => orient(false)}
                        >
                          <RectangleVertical /> Portret
                        </button>
                        <button
                          type="button"
                          aria-pressed={landscape}
                          onClick={() => orient(true)}
                        >
                          <RectangleHorizontal /> Peizazh
                        </button>
                      </div>
                      <button
                        type="button"
                        className="photo-native-ratio"
                        disabled={!nativeSize}
                        onClick={() => {
                          selectSizeMode("photo")
                          setPreview("crop")
                        }}
                      >
                        <Frame size={13} /> Ruaj formatin e fotos
                      </button>
                      <div className="photo-crop-actions">
                        <button
                          type="button"
                          onClick={() => setPreview("crop")}
                        >
                          <Crop /> Përshtat prerjen
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            changeView(CENTRED)
                            setPreview("crop")
                          }}
                        >
                          <RotateCcw /> Rivendos
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
              {step === 1 && (
                <>
                  <div
                    className="photo-size-modes"
                    role="group"
                    aria-label="Lloji i madhësisë"
                  >
                    <button
                      type="button"
                      aria-pressed={sizeMode === "standard"}
                      onClick={() => selectSizeMode("standard")}
                    >
                      Standarde
                    </button>
                    <button
                      type="button"
                      aria-pressed={sizeMode === "custom"}
                      onClick={() => selectSizeMode("custom")}
                    >
                      Custom
                    </button>
                    <button
                      type="button"
                      aria-pressed={sizeMode === "photo"}
                      disabled={!nativeSize}
                      title={
                        !draft
                          ? "Ngarko foton fillimisht"
                          : !nativeSize
                            ? "Ky raport kërkon madhësi jashtë kufijve të printimit"
                            : "Përshtat përmasat me raportin e fotos"
                      }
                      onClick={() => selectSizeMode("photo")}
                    >
                      Sipas fotos
                    </button>
                  </div>
                  {sizeMode !== "standard" && (
                    <CustomPhotoSize
                      key={sizeMode}
                      dims={dims}
                      aspect={sourceAspect ?? aspect}
                      locked={ratioLocked}
                      canLock={!!nativeSize}
                      onLock={() => {
                        if (ratioLocked) {
                          setRatioLocked(false)
                          setSizeMode("custom")
                        } else selectSizeMode("photo")
                      }}
                      onChange={changeDimensions}
                      onValidity={setSizeValid}
                    />
                  )}
                  <SizeFinishPicker
                    compact
                    hideSizes={sizeMode !== "standard"}
                    product={photoProduct}
                    value={variantId}
                    onChange={(value) => {
                      setVariantId(value)
                      setAdded(false)
                    }}
                    landscape={landscape}
                    quality={
                      draft
                        ? (sizeId) => {
                            const cm = getPosterSize(sizeId)!.cm
                            const nextDims = landscape ? [cm[1], cm[0]] : cm
                            const nextCrop = cropFor(
                              draft,
                              nextDims[0] / nextDims[1],
                              view.zoom,
                              view.cx,
                              view.cy,
                            )
                            return qualityLabel(
                              photoDpi(draft, nextCrop, nextDims[0]),
                            ).level as "great" | "good" | "ok" | "low"
                          }
                        : undefined
                    }
                  />
                  <details className="photo-details">
                    <summary>Detajet e printit</summary>
                    <p>{finish.description}</p>
                    {finish.frame && (
                      <p>
                        Korniza: {outer[0]} × {outer[1]} cm, me 2 cm në çdo anë.
                      </p>
                    )}
                    {sizeMode !== "standard" && (
                      <p>
                        Çmimi përdor tarifën standarde më të ulët që i përfshin
                        përmasat custom.
                      </p>
                    )}
                  </details>
                </>
              )}
              {step === 2 && (
                <>
                  <div className="photo-summary">
                    {photo && (
                      <PrintSurface
                        finish={parsed.finish}
                        scale={1.6}
                        photo={photo}
                        style={{
                          width: (outer[0] / outer[1]) * 112,
                          height: 112,
                        }}
                      />
                    )}
                    <div>
                      <strong>{draft?.name ?? "Ende pa foto"}</strong>
                      <span>
                        {dims[0]} × {dims[1]} cm ·{" "}
                        {dims[0] === dims[1]
                          ? "Katror"
                          : landscape
                            ? "Peizazh"
                            : "Portret"}
                      </span>
                      <span>{finish.label}</span>
                      {finish.frame && (
                        <small>
                          Me kornizë: {outer[0]} × {outer[1]} cm
                        </small>
                      )}
                      <button
                        className="cube-text-link"
                        type="button"
                        onClick={() => goTo(0)}
                      >
                        Ndrysho foton ose prerjen <ArrowRight />
                      </button>
                    </div>
                  </div>
                  <dl className="photo-order-details">
                    <div>
                      <dt>Sasia</dt>
                      <dd>
                        {selection.minQuantity}{" "}
                        {selection.minQuantity === 1
                          ? "copë"
                          : "copë (minimumi)"}
                      </dd>
                    </div>
                    {selection.minQuantity > 1 && (
                      <div>
                        <dt>Çmimi për copë</dt>
                        <dd>{selection.price} €</dd>
                      </div>
                    )}
                  </dl>
                  <button
                    className="cube-button cube-wall-try"
                    type="button"
                    disabled={!ready}
                    onClick={sendToWall}
                  >
                    Provoje në murin tënd <Frame size={17} />
                  </button>
                </>
              )}
              {draft && (
                <div className={`photo-quality quality-${quality.level}`}>
                  <span />
                  <strong>{quality.label}</strong>
                  <small>
                    ~{dpi} dpi · {dims[0]} × {dims[1]} cm
                    {quality.level === "low" &&
                      " · zgjidh format më të vogël ose zvogëlo zmadhimin"}
                  </small>
                </div>
              )}
              <p className="photo-status" role="status">
                {draft?.status === "reading" && "Po përgatitet pamja…"}
                {draft?.status === "uploading" &&
                  `Po ngarkohet… ${draft.progress}%`}
                {draft?.status === "done" && (
                  <>
                    <Check /> Fotoja u ngarkua.
                  </>
                )}
                {draft?.status === "error" && (
                  <>
                    {draft.error}{" "}
                    <button
                      type="button"
                      onClick={() => input.current?.click()}
                    >
                      Provo përsëri
                    </button>
                  </>
                )}
                {(draft?.status === "local" || (!draft && enabled === false)) &&
                  "Vetëm pamje paraprake · ngarkimi online s’është aktiv."}
              </p>
              {draft?.status === "uploading" && (
                <progress
                  aria-label="Ngarkimi i fotos"
                  max={100}
                  value={draft.progress}
                />
              )}
              {error && (
                <p className="photo-error" role="alert">
                  {error}
                </p>
              )}
              {added && (
                <div className="photo-added" role="status">
                  <strong>
                    <Check /> U shtua në shportë.
                  </strong>
                  <button
                    type="button"
                    className="cube-text-link"
                    onClick={() => {
                      choice.current++
                      reset()
                      setAdded(false)
                      setError("")
                      setPreview("room")
                      goTo(0)
                    }}
                  >
                    Printo një foto tjetër <ArrowRight size={14} />
                  </button>
                </div>
              )}
              <p className="photo-privacy">
                <ShieldCheck size={15} />{" "}
                {draft?.status === "local" || enabled === false
                  ? "Fotoja qëndron në këtë shfletues."
                  : "Origjinali ruhet privatisht për printim."}
              </p>
            </div>
            <footer className="photo-panel-footer">
              <div className="photo-price">
                <span>
                  {dims[0]} × {dims[1]} cm · {finish.label}
                  {selection.minQuantity > 1 && (
                    <small>
                      {selection.minQuantity} copë × {selection.price} €
                    </small>
                  )}
                </span>
                <strong>{selection.price * selection.minQuantity} €</strong>
              </div>
              <div className="photo-footer-actions">
                {step > 0 && !added && (
                  <button
                    type="button"
                    className="photo-back"
                    onClick={() => goTo(step - 1)}
                    aria-label="Hapi i mëparshëm"
                  >
                    <ArrowLeft />
                  </button>
                )}
                {added ? (
                  <a
                    className="cube-button cube-button-dark"
                    href="/shop?cart=1"
                  >
                    <ShoppingBag size={17} /> Shiko shportën
                  </a>
                ) : step < 2 ? (
                  <button
                    type="button"
                    className="cube-button cube-button-dark"
                    disabled={
                      (step === 0 && !draft) || (step === 1 && !sizeValid)
                    }
                    onClick={() => goTo(step + 1)}
                  >
                    {step === 0 ? "Zgjidh formatin" : "Kontrollo printin"}
                    <ArrowRight size={17} />
                  </button>
                ) : (
                  <button
                    className="cube-button cube-button-dark photo-add"
                    type="button"
                    disabled={!ready}
                    onClick={addToCart}
                  >
                    <ShoppingBag size={17} /> Shto në shportë
                  </button>
                )}
              </div>
            </footer>
          </aside>
        </div>
        <input
          ref={input}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Zgjidh foton"
          onChange={(event) => {
            void choose(event.target.files?.[0])
            event.target.value = ""
          }}
        />
      </main>
    </StoreShell>
  )
}
