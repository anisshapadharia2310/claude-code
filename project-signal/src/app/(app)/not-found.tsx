import { ButtonLink } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

/** A record or page inside the shell that does not exist. */
export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-lg animate-rise rounded-xl border border-line bg-surface p-8 text-center shadow-md">
        <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-navy-100 text-navy-500">
          <Icon name="search" className="h-6 w-6" />
        </span>

        <h1 className="text-lg font-semibold text-navy-900">That record does not exist</h1>
        <p className="mt-2.5 text-base leading-relaxed text-navy-600">
          It may have been removed, or the link may be out of date. The contact list is the quickest way back
          to whatever you were looking for.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <ButtonLink href="/contacts" icon="contacts">Go to contacts</ButtonLink>
          <ButtonLink href="/" variant="outline" icon="dashboard">Back to the dashboard</ButtonLink>
        </div>
      </div>
    </div>
  );
}
