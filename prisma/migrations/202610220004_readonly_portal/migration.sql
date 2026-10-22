-- Papel exclusivo de consulta: não recebe permissões de escrita.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'VIEWER';

-- Login opcional com usuário, mantendo e-mails existentes sem alterações.
ALTER TABLE "User" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
