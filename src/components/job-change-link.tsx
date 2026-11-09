import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
export function JobChangeLink(){return <Button asChild variant="outline" className="my-3"><Link to="/job-changes">Job change approvals</Link></Button>;}
