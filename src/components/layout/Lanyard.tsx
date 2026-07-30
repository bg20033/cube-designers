import { RoundedBox } from "@react-three/drei"
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  type RapierRigidBody,
  type RigidBodyProps,
} from "@react-three/rapier"
import {
  Canvas,
  useFrame,
  type ThreeEvent,
} from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import { MeshLineGeometry, MeshLineMaterial } from "meshline"
import * as THREE from "three"

type LanyardProps = { onActivate: () => void }
type BandProps = LanyardProps & { isMobile: boolean }
type LanyardBody = RapierRigidBody & { lerped?: THREE.Vector3 }

const CARD_WIDTH = 2.45
const CARD_HEIGHT = 3.45
const BAND_WIDTH = 0.16
const BAND_ACCENT_WIDTH = 0.024

function createBadgeTexture(back = false) {
  const canvas = document.createElement("canvas")
  canvas.width = 768
  canvas.height = 1080
  const context = canvas.getContext("2d")

  if (!context) return new THREE.Texture()

  context.fillStyle = back ? "#151317" : "#f4f1ea"
  context.fillRect(0, 0, canvas.width, canvas.height)

  if (back) {
    context.fillStyle = "#f97316"
    context.fillRect(0, 0, 72, canvas.height)
    context.fillStyle = "#f4f1ea"
    context.font = "900 104px Arial, sans-serif"
    context.fillText("CUBE", 118, 250)
    context.fillStyle = "rgba(244,241,234,.56)"
    context.font = "600 24px Arial, sans-serif"
    context.letterSpacing = "8px"
    context.fillText("CREATIVE ACCESS", 122, 312)
    context.fillStyle = "#8b5cf6"
    context.fillRect(122, 842, 510, 5)
    context.fillStyle = "rgba(244,241,234,.68)"
    context.font = "700 26px Arial, sans-serif"
    context.letterSpacing = "4px"
    context.fillText("DESIGN / PRINT / DIGITAL", 122, 907)
  } else {
    const gradient = context.createLinearGradient(0, 0, 768, 1080)
    gradient.addColorStop(0, "rgba(249,115,22,.16)")
    gradient.addColorStop(0.58, "rgba(139,92,246,.04)")
    gradient.addColorStop(1, "rgba(139,92,246,.18)")
    context.fillStyle = gradient
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = "#0b0b0d"
    context.font = "900 112px Arial, sans-serif"
    context.fillText("CUBE", 62, 270)
    context.fillStyle = "#f97316"
    context.fillRect(62, 300, 108, 10)
    context.fillStyle = "#0b0b0d"
    context.font = "700 25px Arial, sans-serif"
    context.letterSpacing = "8px"
    context.fillText("ACCESS PASS", 62, 360)
    context.strokeStyle = "rgba(11,11,13,.13)"
    context.lineWidth = 3
    context.beginPath()
    context.moveTo(62, 414)
    context.lineTo(706, 414)
    context.stroke()
    context.fillStyle = "#8b5cf6"
    context.fillRect(62, 478, 250, 232)
    context.fillStyle = "#d9ff43"
    context.beginPath()
    context.arc(405, 594, 116, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = "#f97316"
    context.fillRect(500, 478, 206, 232)
    context.fillStyle = "#0b0b0d"
    context.font = "900 50px Arial, sans-serif"
    context.fillText("ALL", 62, 810)
    context.fillText("FORMATS.", 62, 868)
    context.fillStyle = "rgba(11,11,13,.54)"
    context.font = "700 22px Arial, sans-serif"
    context.letterSpacing = "5px"
    context.fillText("MEMBER  /  0001", 62, 994)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

export default function Lanyard({ onActivate }: LanyardProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 720)
    updateViewport()
    window.addEventListener("resize", updateViewport)
    return () => window.removeEventListener("resize", updateViewport)
  }, [])

  return (
    <Canvas
      camera={{
        position: [0, 0, isMobile ? 17 : 15],
        fov: isMobile ? 35 : 31,
      }}
      dpr={[1, isMobile ? 1.15 : 1.45]}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color("#ebe9e3"), 0)
        gl.outputColorSpace = THREE.SRGBColorSpace
      }}
    >
      <ambientLight intensity={2.15} />
      <directionalLight color="#fff9f0" intensity={3.2} position={[-4, 5, 7]} />
      <pointLight color="#ffb078" intensity={14} position={[4, -3, 4]} />
      <Physics gravity={[0, -36, 0]} timeStep={1 / 60} interpolate>
        <Band isMobile={isMobile} onActivate={onActivate} />
      </Physics>
    </Canvas>
  )
}

function Band({ isMobile, onActivate }: BandProps) {
  const fixed = useRef<RapierRigidBody>(null!)
  const joint1 = useRef<LanyardBody>(null!)
  const joint2 = useRef<LanyardBody>(null!)
  const joint3 = useRef<RapierRigidBody>(null!)
  const card = useRef<RapierRigidBody>(null!)
  const band = useRef<
    THREE.Mesh<
      InstanceType<typeof MeshLineGeometry>,
      InstanceType<typeof MeshLineMaterial>
    >
  >(null)
  const bandAccent = useRef<
    THREE.Mesh<
      InstanceType<typeof MeshLineGeometry>,
      InstanceType<typeof MeshLineMaterial>
    >
  >(null)
  const cardVisual = useRef<THREE.Group>(null)
  const pressOrigin = useRef({ x: 0, y: 0 })
  const activationTimer = useRef<number | undefined>(undefined)
  const frontTexture = useMemo(() => createBadgeTexture(), [])
  const backTexture = useMemo(() => createBadgeTexture(true), [])
  const bandGeometry = useMemo(() => new MeshLineGeometry(), [])
  const bandAccentGeometry = useMemo(() => new MeshLineGeometry(), [])
  const bandMaterial = useMemo(
    () => {
      const material = new MeshLineMaterial({
        color: new THREE.Color("#151317"),
        lineWidth: BAND_WIDTH,
        resolution: new THREE.Vector2(
          isMobile ? 800 : 1440,
          isMobile ? 1200 : 900,
        ),
        sizeAttenuation: 1,
      })
      material.depthTest = true
      material.depthWrite = false
      return material
    },
    [isMobile],
  )
  const bandAccentMaterial = useMemo(
    () => {
      const material = new MeshLineMaterial({
        color: new THREE.Color("#f97316"),
        lineWidth: BAND_ACCENT_WIDTH,
        resolution: new THREE.Vector2(
          isMobile ? 800 : 1440,
          isMobile ? 1200 : 900,
        ),
        sizeAttenuation: 1,
      })
      material.depthTest = true
      material.depthWrite = false
      return material
    },
    [isMobile],
  )
  const [dragOffset, setDragOffset] = useState<false | THREE.Vector3>(false)
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
  )
  const point = useMemo(() => new THREE.Vector3(), [])
  const direction = useMemo(() => new THREE.Vector3(), [])
  const cardAnchor = useMemo(() => new THREE.Vector3(), [])
  const cardQuaternion = useMemo(() => new THREE.Quaternion(), [])
  const angularVelocity = useMemo(() => new THREE.Vector3(), [])
  const rotation = useMemo(() => new THREE.Vector3(), [])

  const segmentProps: RigidBodyProps = {
    type: "dynamic",
    colliders: false,
    canSleep: true,
    angularDamping: 1.45,
    linearDamping: 1.8,
  }

  useRopeJoint(fixed, joint1, [[0, 0, 0], [0, 0, 0], 1.1])
  useRopeJoint(joint1, joint2, [[0, 0, 0], [0, 0, 0], 1.1])
  useRopeJoint(joint2, joint3, [[0, 0, 0], [0, 0, 0], 1.1])
  useSphericalJoint(joint3, card, [
    [0, 0, 0],
    [0, CARD_HEIGHT / 2 + 0.08, 0],
  ])

  useEffect(() => {
    document.body.style.cursor = hovered ? (dragOffset ? "grabbing" : "grab") : ""
    return () => {
      document.body.style.cursor = ""
    }
  }, [dragOffset, hovered])

  useEffect(
    () => () => {
      window.clearTimeout(activationTimer.current)
      frontTexture.dispose()
      backTexture.dispose()
      bandGeometry.dispose()
      bandAccentGeometry.dispose()
    },
    [backTexture, bandAccentGeometry, bandGeometry, frontTexture],
  )

  useEffect(() => () => bandMaterial.dispose(), [bandMaterial])
  useEffect(() => () => bandAccentMaterial.dispose(), [bandAccentMaterial])

  const getSmoothedPoint = (body: LanyardBody) => {
    if (!body.lerped) {
      body.lerped = new THREE.Vector3().copy(body.translation())
    }
    return body.lerped
  }

  useFrame((state, delta) => {
    if (
      dragOffset &&
      fixed.current &&
      joint1.current &&
      joint2.current &&
      joint3.current &&
      card.current
    ) {
      point.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      direction.copy(point).sub(state.camera.position).normalize()
      point.add(direction.multiplyScalar(state.camera.position.length()))
      ;[card.current, joint1.current, joint2.current, joint3.current].forEach(
        (body) => body.wakeUp(),
      )
      card.current.setNextKinematicTranslation({
        x: point.x - dragOffset.x,
        y: point.y - dragOffset.y,
        z: point.z - dragOffset.z,
      })
    }

    if (
      band.current &&
      bandAccent.current &&
      fixed.current &&
      joint1.current &&
      joint2.current &&
      joint3.current &&
      card.current
    ) {
      ;[joint1.current, joint2.current].forEach((body) => {
        const smoothed = getSmoothedPoint(body)
        const distance = Math.min(
          1,
          Math.max(0.1, smoothed.distanceTo(body.translation())),
        )
        smoothed.lerp(body.translation(), delta * (4 + distance * 46))
      })
      const cardRotation = card.current.rotation()
      cardQuaternion.set(
        cardRotation.x,
        cardRotation.y,
        cardRotation.z,
        cardRotation.w,
      )
      cardAnchor
        .set(0, CARD_HEIGHT / 2 + 0.08, 0)
        .applyQuaternion(cardQuaternion)
        .add(card.current.translation())
      curve.points[0].copy(cardAnchor)
      curve.points[1].copy(getSmoothedPoint(joint2.current))
      curve.points[2].copy(getSmoothedPoint(joint1.current))
      curve.points[3].copy(fixed.current.translation())
      const curvePoints = curve.getPoints(isMobile ? 20 : 28)
      band.current.geometry.setPoints(curvePoints)
      bandAccent.current.geometry.setPoints(curvePoints)
      angularVelocity.copy(card.current.angvel())
      rotation.copy(card.current.rotation())
      card.current.setAngvel(
        {
          x: angularVelocity.x,
          y: angularVelocity.y - rotation.y * 0.22,
          z: angularVelocity.z,
        },
        true,
      )
    }

    if (cardVisual.current) {
      const target = pressed ? 0.92 : 1
      const next = THREE.MathUtils.damp(
        cardVisual.current.scale.x,
        target,
        34,
        delta,
      )
      cardVisual.current.scale.setScalar(next)
    }
  })

  curve.curveType = "chordal"

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    pressOrigin.current = {
      x: event.nativeEvent.clientX,
      y: event.nativeEvent.clientY,
    }
    ;(event.target as Element).setPointerCapture(event.pointerId)
    if (card.current) {
      setDragOffset(
        new THREE.Vector3()
          .copy(event.point)
          .sub(point.copy(card.current.translation())),
      )
    }
  }

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    ;(event.target as Element).releasePointerCapture(event.pointerId)
    setDragOffset(false)
    const moved = Math.hypot(
      event.nativeEvent.clientX - pressOrigin.current.x,
      event.nativeEvent.clientY - pressOrigin.current.y,
    )
    if (moved <= 8) {
      setPressed(true)
      activationTimer.current = window.setTimeout(onActivate, 35)
    }
  }

  const cancelDrag = () => {
    setDragOffset(false)
    setPressed(false)
  }

  return (
    <>
      <group position={[0, isMobile ? 4.9 : 5.1, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody ref={joint1} {...segmentProps} position={[0.5, -0.35, 0]}>
          <BallCollider args={[0.08]} />
        </RigidBody>
        <RigidBody ref={joint2} {...segmentProps} position={[0.8, -1.2, 0]}>
          <BallCollider args={[0.08]} />
        </RigidBody>
        <RigidBody ref={joint3} {...segmentProps} position={[0.35, -2.15, 0]}>
          <BallCollider args={[0.08]} />
        </RigidBody>
        <RigidBody
          ref={card}
          {...segmentProps}
          position={[0.7, -4.15, 0]}
          type={dragOffset ? "kinematicPosition" : "dynamic"}
        >
          <CuboidCollider
            args={[CARD_WIDTH / 2, CARD_HEIGHT / 2, 0.1]}
          />
          <group
            ref={cardVisual}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={cancelDrag}
            onLostPointerCapture={cancelDrag}
            onPointerOver={(event) => {
              event.stopPropagation()
              setHovered(true)
            }}
            onPointerOut={() => setHovered(false)}
          >
            <RoundedBox
              args={[CARD_WIDTH, CARD_HEIGHT, 0.16]}
              radius={0.13}
              smoothness={6}
            >
              <meshPhysicalMaterial
                color="#f4f1ea"
                roughness={0.3}
                metalness={0.04}
                clearcoat={0.72}
                clearcoatRoughness={0.28}
              />
            </RoundedBox>
            <mesh position={[0, 0, 0.086]}>
              <planeGeometry
                args={[CARD_WIDTH - 0.07, CARD_HEIGHT - 0.07]}
              />
              <meshBasicMaterial map={frontTexture} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0, -0.086]} rotation={[0, Math.PI, 0]}>
              <planeGeometry
                args={[CARD_WIDTH - 0.07, CARD_HEIGHT - 0.07]}
              />
              <meshBasicMaterial map={backTexture} toneMapped={false} />
            </mesh>
            <RoundedBox
              args={[0.7, 0.13, 0.065]}
              radius={0.055}
              smoothness={4}
              position={[0, 1.43, 0.135]}
            >
              <meshStandardMaterial color="#171619" roughness={0.58} />
            </RoundedBox>
            <RoundedBox
              args={[0.46, 0.23, 0.13]}
              radius={0.055}
              smoothness={4}
              position={[0, 1.81, -0.005]}
            >
              <meshStandardMaterial
                color="#aaa7a1"
                metalness={0.82}
                roughness={0.28}
              />
            </RoundedBox>
          </group>
        </RigidBody>
      </group>
      <mesh
        ref={band}
        geometry={bandGeometry}
        material={bandMaterial}
        frustumCulled={false}
        renderOrder={-2}
      />
      <mesh
        ref={bandAccent}
        geometry={bandAccentGeometry}
        material={bandAccentMaterial}
        frustumCulled={false}
        renderOrder={-1}
      />
    </>
  )
}
