import GuestInvitation from "./GuestInvitation"
import type { Attendance, GeneralInvitation, Invitation } from "./model"

export default function GeneralInvitationPage({ invitation, online, onRegister, onRespond }: {
  invitation: GeneralInvitation; online: boolean
  /** Saves the first answer and returns the guest's new personal invitation. */
  onRegister: (name: string, count: number, responses: Record<string, Attendance>) => Promise<Invitation | false>
  /** Later edits on the same page, saved against the personal invitation returned by onRegister. */
  onRespond: (invitation: Invitation, responses: Record<string, Attendance>) => Promise<boolean>
}) {
  const personal: Invitation = { ...invitation, guest: { id: "general", token: "general", name: "Ju dhe familja juaj", capacity: 1, kind: "individual", message: "", events: invitation.events.map((event) => event.id), responses: {} } }
  return <GuestInvitation invitation={personal} online={online} onRespond={(responses, current) => current.guest.token === "general" ? false : onRespond(current, responses)} registration={{ capacity: invitation.capacity, onRegister }} />
}
