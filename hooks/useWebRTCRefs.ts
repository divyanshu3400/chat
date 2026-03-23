import { createRef } from 'react'

/* Created once at module load — same object for the entire app lifetime */
export const globalLocalRef = createRef<HTMLVideoElement>() as React.MutableRefObject<HTMLVideoElement | null>
export const globalRemoteRef = createRef<HTMLVideoElement>() as React.MutableRefObject<HTMLVideoElement | null>

export function rebindStreams(
   pcRef: React.MutableRefObject<RTCPeerConnection | null>
) {
   const pc = pcRef.current
   if (!pc) return

   /* Re-bind remote stream from the first receiver that has a track */
   const remoteStream = pc.getReceivers()
      .map(r => r.track)
      .filter(Boolean)
      .reduce((stream, track) => {
         if (!stream) stream = new MediaStream()
         stream.addTrack(track)
         return stream
      }, null as MediaStream | null)

   if (remoteStream && globalRemoteRef.current) {
      globalRemoteRef.current.srcObject = remoteStream
   }

   /* Local stream is on the senders */
   const localStream = pc.getSenders()
      .map(s => s.track)
      .filter(Boolean)
      .reduce((stream, track) => {
         if (!stream) stream = new MediaStream()
         if (track)
            stream.addTrack(track)
         return stream
      }, null as MediaStream | null)

   if (localStream && globalLocalRef.current) {
      globalLocalRef.current.srcObject = localStream
   }
}