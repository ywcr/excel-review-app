import LoginForm from '@/components/LoginForm';
import SecurityWarning from "@/components/SecurityWarning";

export default function LoginPage() {
  return (
    <>
      <SecurityWarning />
      <LoginForm />
    </>
  );
}
