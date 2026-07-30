import { Environment, Lightformer, RoundedBox } from "@react-three/drei"
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
    context.font = "900 108px Arial, sans-serif"
    context.fillText("CUBE", 118, 184)
    context.fillStyle = "rgba(244,241,234,.56)"
    context.font = "600 24px Arial, sans-serif"
    context.letterSpacing = "8px"
    context.fillText("CREATIVE ACCESS", 122, 246)
    context.fillStyle = "#8b5cf6"
    context.fillRect(122, 850, 510, 5)
    context.fillStyle = "rgba(244,241,234,.68)"
    context.font = "700 26px Arial, sans-serif"
    context.letterSpacing = "4px"
    context.fillText("DESIGN / PRINT / DIGITAL", 122, 915)
  } else {
    const gradient = context.createLinearGradient(0, 0, 768, 1080)
    gradient.addColorStop(0, "rgba(249,115,22,.16)")
    gradient.addColorStop(0.58, "rgba(139,92,246,.04)")
    gradient.addColorStop(1, "rgba(139,92,246,.18)")
    context.fillStyle = gradient
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = "#0b0b0d"
    context.font = "900 120px Arial, sans-serif"
    context.fillText("CUBE", 62, 192)
    context.fillStyle = "#f97316"
    context.fillRect(62, 226, 116, 12)
    context.fillStyle = "#0b0b0d"
    context.font = "700 27px Arial, sans-serif"
    context.letterSpacing = "8px"
    context.fillText("ACCESS PASS", 62, 296)
    context.strokeStyle = "rgba(11,11,13,.13)"
    context.lineWidth = 3
    context.beginPath()
    context.moveTo(62, 360)
    context.lineTo(706, 360)
    context.stroke()
    context.fillStyle = "#8b5cf6"
    context.fillRect(62, 426, 250, 250)
    context.fillStyle = "#d9ff43"
    context.beginPath()
    context.arc(405, 551, 124, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = "#f97316"
    context.fillRect(500, 426, 206, 250)
    context.fillStyle = "#0b0b0d"
    context.font = "900 50px Arial, sans-serif"
    context.fillText("ALL", 62, 777)
    context.fillText("FORMATS.", 62, 835)
    context.fillStyle = "rgba(11,11,13,.54)"
    context.font = "700 22px Arial, sans-serif"
    context.letterSpacing = "5px"
    context.fillText("MEMBER  /  0001", 62, 970)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
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
        position: [0, 0, isMobile ? 17.5 : 15],
        fov: isMobile ? 36 : 31,
      }}
      dpr={[1, isMobile ? 1.35 : 1.8]}
      gl={{
        alpha: true,
        antialias: !isMobile,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color("#ebe9e3"), 0)
        gl.outputColorSpace = THREE.SRGBColorSpace
      }}
    >
      <ambientLight intensity={1.6} />
      <Physics gravity={[0, -32, 0]} timeStep={isMobile ? 1 / 45 : 1 / 60}>
        <Band isMobile={isMobile} onActivate={onActivate} />
      </Physics>
      <Environment resolution={128}>
        <Lightformer
          intensity={4}
          color="#ffffff"
          position={[-4, 2, 6]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[12, 4, 1]}
        />
        <Lightformer
          intensity={3}
          color="#ffb078"
          position={[5, -2, 3]}
          rotation={[0, 0, -Math.PI / 4]}
          scale={[10, 3, 1]}
        />
      </Environment>
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
  const cardVisual = useRef<THREE.Group>(null)
  const pressOrigin = useRef({ x: 0, y: 0 })
  const activationTimer = useRef<number | undefined>(undefined)
  const frontTexture = useMemo(() => createBadgeTexture(), [])
  const backTexture = useMemo(() => createBadgeTexture(true), [])
  const bandGeometry = useMemo(() => new MeshLineGeometry(), [])
  const bandMaterial = useMemo(
    () => {
      const material = new MeshLineMaterial({
        color: new THREE.Color("#151317"),
        lineWidth: 0.72,
        resolution: new THREE.Vector2(
          isMobile ? 800 : 1440,
          isMobile ? 1200 : 900,
        ),
        sizeAttenuation: 1,
      })
      material.depthTest = false
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
  const angularVelocity = useMemo(() => new THREE.Vector3(), [])
  const rotation = useMemo(() => new THREE.Vector3(), [])

  const segmentProps: RigidBodyProps = {
    type: "dynamic",
    colliders: false,
    canSleep: true,
    angularDamping: 4,
    linearDamping: 4,
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
    },
    [backTexture, bandGeometry, frontTexture],
  )

  useEffect(() => () => bandMaterial.dispose(), [bandMaterial])

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
      curve.points[0].copy(joint3.current.translation())
      curve.points[1].copy(getSmoothedPoint(joint2.current))
      curve.points[2].copy(getSmoothedPoint(joint1.current))
      curve.points[3].copy(fixed.current.translation())
      band.current.geometry.setPoints(curve.getPoints(isMobile ? 18 : 32))
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
      const target = pressed ? 0.94 : 1
      const next = THREE.MathUtils.damp(
        cardVisual.current.scale.x,
        target,
        18,
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
      activationTimer.current = window.setTimeout(onActivate, 140)
    }
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
                roughness={0.24}
                metalness={0.08}
                clearcoat={1}
                clearcoatRoughness={0.22}
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
              args={[0.82, 0.18, 0.08]}
              radius={0.08}
              smoothness={4}
              position={[0, 1.36, 0.14]}
            >
              <meshStandardMaterial color="#0b0b0d" roughness={0.48} />
            </RoundedBox>
            <RoundedBox
              args={[0.55, 0.26, 0.16]}
              radius={0.06}
              smoothness={4}
              position={[0, 1.82, 0]}
            >
              <meshStandardMaterial
                color="#bab8b4"
                metalness={0.92}
                roughness={0.2}
              />
            </RoundedBox>
          </group>
        </RigidBody>
      </group>
      <mesh ref={band} geometry={bandGeometry} material={bandMaterial} />
    </>
  )
}
