import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  password: string;
  role: "user" | "admin";
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Le nom est requis"],
      trim: true,
      minlength: [2, "Le nom doit contenir au moins 2 caractères"],
      maxlength: [100, "Le nom ne peut pas dépasser 100 caractères"],
    },
    username: {
      type: String,
      required: [true, "Le nom d'utilisateur est requis"],
      unique: [true, "Ce nom d'utilisateur est déjà pris"],
      trim: true,
      minlength: [3, "Le nom d'utilisateur doit contenir au moins 3 caractères"],
      maxlength: [50, "Le nom d'utilisateur ne peut pas dépasser 50 caractères"],
      match: [/^[a-zA-Z0-9_]+$/, "Le nom d'utilisateur ne peut contenir que des lettres, chiffres et underscores (exemple: john_doe123)"],
    },
    email: {
      type: String,
      required: [true, "L'email est requis"],
      unique: [true, "Cet email est déjà utilisé"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Veuillez fournir un email valide (exemple: nom@domaine.com)"],
    },
    password: {
      type: String,
      required: [true, "Le mot de passe est requis"],
      minlength: [6, "Le mot de passe doit contenir au moins 6 caractères (lettres, chiffres et symboles recommandés)"],
    },
    role: {
      type: String,
      enum: {
        values: ["user", "admin"],
        message: "Le rôle doit être 'user' (utilisateur) ou 'admin' (administrateur)",
      },
      default: "user",
    },
  },
  { timestamps: true }
);

// ✅ Hash password avant sauvegarde
UserSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

// ✅ Méthode pour comparer les mots de passe
UserSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>("User", UserSchema);