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
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MeshLineGeometry, MeshLineMaterial } from "meshline"
import * as THREE from "three"

type LanyardProps = { onActivate: () => void }
type GyroMotion = { x: number; z: number; active: boolean }
type BandProps = LanyardProps & {
  isMobile: boolean
  gyroMotion: { current: GyroMotion }
  requestGyroscope: () => void
}
type OrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">
}

const CARD_WIDTH = 2.45
const CARD_HEIGHT = 3.45
const BAND_WIDTH = 0.16
const BAND_ACCENT_WIDTH = 0.024
const RELEASE_RETURN_SPEED = 7
const MOBILE_BREAKPOINT = "(max-width: 719px)"
const DESKTOP_BAND_POINTS = 29
const MOBILE_BAND_POINTS = 21

const SEGMENT_PROPS: RigidBodyProps = {
  type: "dynamic",
  colliders: false,
  canSleep: true,
  angularDamping: 3,
  linearDamping: 2.8,
}

function createBadgeTexture(back = false, mobile = false) {
  const canvas = document.createElement("canvas")
  const textureWidth = mobile ? 384 : 512
  const textureScale = textureWidth / 768
  canvas.width = textureWidth
  canvas.height = Math.round(1080 * textureScale)
  const context = canvas.getContext("2d")

  if (!context) return new THREE.Texture()

  context.scale(textureScale, textureScale)
  context.fillStyle = back ? "#151317" : "#f4f1ea"
  context.fillRect(0, 0, 768, 1080)

  if (back) {
    context.fillStyle = "#f97316"
    context.fillRect(0, 0, 72, 1080)
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
    context.fillRect(0, 0, 768, 1080)
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

function createBandGeometry(pointCount: number) {
  const geometry = new MeshLineGeometry()
  geometry.setPoints(new Float32Array(pointCount * 3))
  ;(["position", "previous", "next"] as const).forEach((attribute) => {
    ;(geometry.getAttribute(attribute) as THREE.BufferAttribute).setUsage(
      THREE.DynamicDrawUsage,
    )
  })
  return geometry
}

function updateBandGeometry(
  geometry: MeshLineGeometry,
  curve: THREE.CatmullRomCurve3,
  points: Float32Array,
  sample: THREE.Vector3,
) {
  const pointCount = points.length / 3

  for (let index = 0; index < pointCount; index += 1) {
    curve.getPoint(index / (pointCount - 1), sample)
    const offset = index * 3
    points[offset] = sample.x
    points[offset + 1] = sample.y
    points[offset + 2] = sample.z
  }

  const position = geometry.getAttribute("position") as THREE.BufferAttribute
  const previous = geometry.getAttribute("previous") as THREE.BufferAttribute
  const next = geometry.getAttribute("next") as THREE.BufferAttribute
  const positionValues = position.array as Float32Array
  const previousValues = previous.array as Float32Array
  const nextValues = next.array as Float32Array

  for (let index = 0; index < pointCount; index += 1) {
    const source = index * 3
    const previousSource = Math.max(0, index - 1) * 3
    const nextSource = Math.min(pointCount - 1, index + 1) * 3
    const destination = index * 6

    for (let duplicate = 0; duplicate < 2; duplicate += 1) {
      const vertex = destination + duplicate * 3
      positionValues[vertex] = points[source]
      positionValues[vertex + 1] = points[source + 1]
      positionValues[vertex + 2] = points[source + 2]
      previousValues[vertex] = points[previousSource]
      previousValues[vertex + 1] = points[previousSource + 1]
      previousValues[vertex + 2] = points[previousSource + 2]
      nextValues[vertex] = points[nextSource]
      nextValues[vertex + 1] = points[nextSource + 1]
      nextValues[vertex + 2] = points[nextSource + 2]
    }
  }

  position.needsUpdate = true
  previous.needsUpdate = true
  next.needsUpdate = true
}

export default function Lanyard({ onActivate }: LanyardProps) {
  const [isMobile, setIsMobile] = useState(false)
  const gyroMotion = useRef<GyroMotion>({ x: 0, z: 0, active: false })
  const gyroBaseline = useRef<{ beta: number; gamma: number } | null>(null)
  const gyroPermissionRequested = useRef(false)

  useEffect(() => {
    const viewport = window.matchMedia(MOBILE_BREAKPOINT)
    const updateViewport = () => setIsMobile(viewport.matches)
    updateViewport()
    viewport.addEventListener("change", updateViewport)
    return () => viewport.removeEventListener("change", updateViewport)
  }, [])

  useEffect(() => {
    if (!isMobile || typeof DeviceOrientationEvent === "undefined") return

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return

      if (!gyroBaseline.current) {
        gyroBaseline.current = { beta: event.beta, gamma: event.gamma }
      }

      const beta = THREE.MathUtils.clamp(
        (event.beta - gyroBaseline.current.beta) / 28,
        -1,
        1,
      )
      const gamma = THREE.MathUtils.clamp(
        (event.gamma - gyroBaseline.current.gamma) / 24,
        -1,
        1,
      )
      const angle = window.screen.orientation?.angle ?? 0
      let x = gamma
      let z = beta

      if (angle === 90) {
        x = -beta
        z = gamma
      } else if (angle === 270 || angle === -90) {
        x = beta
        z = -gamma
      }

      gyroMotion.current.x = THREE.MathUtils.lerp(gyroMotion.current.x, x, 0.22)
      gyroMotion.current.z = THREE.MathUtils.lerp(gyroMotion.current.z, z, 0.22)
      gyroMotion.current.active = true
    }

    window.addEventListener("deviceorientation", handleOrientation, true)
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true)
      gyroBaseline.current = null
      gyroMotion.current = { x: 0, z: 0, active: false }
    }
  }, [isMobile])

  const requestGyroscope = useCallback(() => {
    if (
      !isMobile ||
      gyroPermissionRequested.current ||
      typeof DeviceOrientationEvent === "undefined"
    ) {
      return
    }

    gyroPermissionRequested.current = true
    const orientationEvent =
      DeviceOrientationEvent as OrientationEventWithPermission

    if (orientationEvent.requestPermission) {
      void orientationEvent.requestPermission().catch(() => {
        gyroPermissionRequested.current = false
      })
    }
  }, [isMobile])

  return (
    <Canvas
      camera={{
        position: [0, 0, isMobile ? 14 : 15],
        fov: isMobile ? 35 : 31,
      }}
      dpr={[1, isMobile ? 1 : 1.25]}
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
      <Physics gravity={[0, -114, 0]} timeStep={1 / 170} interpolate>
        <Band
          isMobile={isMobile}
          gyroMotion={gyroMotion}
          requestGyroscope={requestGyroscope}
          onActivate={onActivate}
        />
      </Physics>
    </Canvas>
  )
}

function Band({
  isMobile,
  gyroMotion,
  requestGyroscope,
  onActivate,
}: BandProps) {
  const fixed = useRef<RapierRigidBody>(null!)
  const joint1 = useRef<RapierRigidBody>(null!)
  const joint2 = useRef<RapierRigidBody>(null!)
  const joint3 = useRef<RapierRigidBody>(null!)
  const card = useRef<RapierRigidBody>(null!)
  const cardVisual = useRef<THREE.Group>(null)
  const pressOrigin = useRef({ x: 0, y: 0 })
  const activationTimer = useRef<number | undefined>(undefined)
  const wasDragging = useRef(false)
  const frontTexture = useMemo(() => createBadgeTexture(false, isMobile), [isMobile])
  const backTexture = useMemo(() => createBadgeTexture(true, isMobile), [isMobile])
  const bandPointCount = isMobile ? MOBILE_BAND_POINTS : DESKTOP_BAND_POINTS
  const bandGeometry = useMemo(
    () => createBandGeometry(bandPointCount),
    [bandPointCount],
  )
  const bandPoints = useMemo(
    () => new Float32Array(bandPointCount * 3),
    [bandPointCount],
  )
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
  const curve = useMemo(() => {
    const nextCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ])
    nextCurve.curveType = "chordal"
    return nextCurve
  }, [])
  const point = useMemo(() => new THREE.Vector3(), [])
  const direction = useMemo(() => new THREE.Vector3(), [])
  const cardAnchor = useMemo(() => new THREE.Vector3(), [])
  const cardQuaternion = useMemo(() => new THREE.Quaternion(), [])
  const gyroForce = useMemo(() => new THREE.Vector3(), [])
  const curveSample = useMemo(() => new THREE.Vector3(), [])
  const joint1Smoothed = useMemo(() => new THREE.Vector3(), [])
  const joint2Smoothed = useMemo(() => new THREE.Vector3(), [])

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
  useEffect(() => () => bandAccentMaterial.dispose(), [bandAccentMaterial])

  useFrame((state, delta) => {
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

    if (
      dragOffset &&
      fixed.current &&
      joint1.current &&
      joint2.current &&
      joint3.current &&
      card.current
    ) {
      wasDragging.current = true
      point.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      direction.copy(point).sub(state.camera.position).normalize()
      point.add(direction.multiplyScalar(state.camera.position.length()))
      card.current.wakeUp()
      joint1.current.wakeUp()
      joint2.current.wakeUp()
      joint3.current.wakeUp()
      card.current.setNextKinematicTranslation({
        x: point.x - dragOffset.x,
        y: point.y - dragOffset.y,
        z: point.z - dragOffset.z,
      })
    }

    if (
      fixed.current &&
      joint1.current &&
      joint2.current &&
      joint3.current &&
      card.current
    ) {
      const gyro = gyroMotion.current
      const gyroActive =
        !dragOffset &&
        isMobile &&
        gyro.active &&
        Math.abs(gyro.x) + Math.abs(gyro.z) > 0.045
      const isSettled =
        !dragOffset &&
        !wasDragging.current &&
        !gyroActive &&
        joint1.current.isSleeping() &&
        joint2.current.isSleeping() &&
        joint3.current.isSleeping() &&
        card.current.isSleeping()

      if (isSettled) return

      const joint1Position = joint1.current.translation()
      const joint2Position = joint2.current.translation()

      if (joint1Smoothed.lengthSq() === 0) joint1Smoothed.copy(joint1Position)
      if (joint2Smoothed.lengthSq() === 0) joint2Smoothed.copy(joint2Position)

      const joint1Distance = THREE.MathUtils.clamp(
        joint1Smoothed.distanceTo(joint1Position),
        0.1,
        1,
      )
      const joint2Distance = THREE.MathUtils.clamp(
        joint2Smoothed.distanceTo(joint2Position),
        0.1,
        1,
      )
      joint1Smoothed.lerp(
        joint1Position,
        Math.min(1, delta * (4 + joint1Distance * 46)),
      )
      joint2Smoothed.lerp(
        joint2Position,
        Math.min(1, delta * (4 + joint2Distance * 46)),
      )
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
      curve.points[1].copy(joint2Smoothed)
      curve.points[2].copy(joint1Smoothed)
      curve.points[3].copy(fixed.current.translation())
      updateBandGeometry(bandGeometry, curve, bandPoints, curveSample)

      if (!dragOffset && wasDragging.current) {
        const fixedPosition = fixed.current.translation()
        const cardPosition = card.current.translation()
        const velocity = card.current.linvel()

        card.current.setLinvel(
          {
            x: THREE.MathUtils.clamp(
              (fixedPosition.x - cardPosition.x) * RELEASE_RETURN_SPEED,
              -15,
              15,
            ),
            y: Math.min(velocity.y, -5),
            z: THREE.MathUtils.clamp(
              (fixedPosition.z - cardPosition.z) * RELEASE_RETURN_SPEED,
              -12,
              12,
            ),
          },
          true,
        )
        wasDragging.current = false
      }

      if (gyroActive) {
        gyroForce.set(gyro.x * 34, 0, gyro.z * 28)
        card.current.addTorque(
          {
            x: gyro.z * 3.4,
            y: gyro.x * 1.5,
            z: -gyro.x * 4.2,
          },
          true,
        )
        joint1.current.addForce(
          { x: gyro.x * 5, y: 0, z: gyro.z * 4 },
          true,
        )
        joint2.current.addForce(
          { x: gyro.x * 8, y: 0, z: gyro.z * 6 },
          true,
        )
        joint3.current.addForce(
          { x: gyro.x * 11, y: 0, z: gyro.z * 9 },
          true,
        )
        card.current.addForce(gyroForce, true)
      }

      const angularVelocity = card.current.angvel()
      card.current.setAngvel(
        {
          x: angularVelocity.x,
          y: angularVelocity.y - cardRotation.y * 0.2,
          z: angularVelocity.z,
        },
        false,
      )
    }

  })

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    requestGyroscope()
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
        <RigidBody ref={fixed} {...SEGMENT_PROPS} type="fixed" />
        <RigidBody ref={joint1} {...SEGMENT_PROPS} position={[0.5, -0.35, 0]}>
          <BallCollider args={[0.08]} />
        </RigidBody>
        <RigidBody ref={joint2} {...SEGMENT_PROPS} position={[0.8, -1.2, 0]}>
          <BallCollider args={[0.08]} />
        </RigidBody>
        <RigidBody ref={joint3} {...SEGMENT_PROPS} position={[0.35, -2.15, 0]}>
          <BallCollider args={[0.08]} />
        </RigidBody>
        <RigidBody
          ref={card}
          {...SEGMENT_PROPS}
          position={[0.7, -4.15, 0]}
          type={dragOffset ? "kinematicPosition" : "dynamic"}
          ccd
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
        geometry={bandGeometry}
        material={bandMaterial}
        frustumCulled={false}
        renderOrder={-2}
      />
      <mesh
        geometry={bandGeometry}
        material={bandAccentMaterial}
        frustumCulled={false}
        renderOrder={-1}
      />
    </>
  )
}
