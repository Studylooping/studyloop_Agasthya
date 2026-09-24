import type { Unit } from "@/lib/content/types";
import { systemParticlesRigidBodyTopics } from "./topics";

export const u5SystemParticlesRigidBody: Unit = {
  slug: "u5-system-particles-rigid-body",
  unitCode: "U5",
  title: "System of Particles and Rotational Motion",
  description:
    "CBSE Class 11 Physics Unit V: centre of mass, torque, angular momentum, conservation of angular momentum, rigid-body equilibrium, rotational kinematics, moment of inertia, and radius of gyration.",
  status: "live",
  topics: systemParticlesRigidBodyTopics,
};
