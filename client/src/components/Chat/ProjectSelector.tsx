import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import { Folder, ChevronDown, X } from 'lucide-react';
import type { TUserProject } from 'librechat-data-provider';
import { useUserProjects, useAssignConversationProject } from '~/data-provider';
import { useLocalize } from '~/hooks';
import store from '~/store';

const isNewConversation = (id: string | null | undefined): boolean =>
  !id || id === 'new' || id === '';

export default function ProjectSelector() {
  const localize = useLocalize();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const conversation = useRecoilValue(store.conversationByIndex(0));
  const setConversation = useSetRecoilState(store.conversationByIndex(0));
  const { data: projectsData } = useUserProjects();
  const assignMutation = useAssignConversationProject();

  const conversationId = conversation?.conversationId;
  const currentProjectId = conversation?.projectId;

  const projectsMap = projectsData?.projects?.reduce<Map<string, TUserProject>>((map, project) => {
    map.set(project._id, project);
    return map;
  }, new Map());

  const currentProject = currentProjectId ? projectsMap?.get(currentProjectId) : undefined;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (projectId: string | null) => {
      setConversation((prev) => (prev ? { ...prev, projectId: projectId ?? undefined } : prev));
      if (!isNewConversation(conversationId)) {
        assignMutation.mutate({ conversationId: conversationId!, projectId });
      }
      setIsOpen(false);
    },
    [conversationId, setConversation, assignMutation],
  );

  const getDropdownPosition = () => {
    if (!buttonRef.current) {
      return { top: 0, left: 0 };
    }
    const rect = buttonRef.current.getBoundingClientRect();
    return { top: rect.bottom + 4, left: rect.left };
  };

  const dropdownMenu = isOpen
    ? createPortal(
      <div
        ref={dropdownRef}
        className="fixed z-[9999] min-w-[180px] rounded-lg border border-border-medium bg-surface-primary py-1 shadow-lg"
        style={getDropdownPosition()}
      >
        <button
          onClick={() => handleSelect(null)}
          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-surface-hover ${
            !currentProjectId ? 'font-medium text-text-primary' : 'text-text-secondary'
          }`}
        >
          <span>{localize('com_ui_general')}</span>
          {currentProjectId != null && <X className="ml-auto h-3 w-3 text-text-tertiary" />}
        </button>

        {projectsData?.projects?.length ? (
          <>
            <div className="my-1 border-t border-border-light" />
            {projectsData.projects.map((project) => (
              <button
                key={project._id}
                onClick={() => handleSelect(project._id)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-surface-hover ${
                  currentProjectId === project._id
                    ? 'font-medium text-text-primary'
                    : 'text-text-secondary'
                }`}
              >
                <Folder className="h-3.5 w-3.5" />
                <span className="truncate">{project.name}</span>
              </button>
            ))}
          </>
        ) : null}
      </div>,
      document.body,
    )
    : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-border-light bg-presentation px-3 py-2 text-sm text-text-primary transition-all ease-in-out hover:bg-surface-tertiary"
        aria-label={localize('com_ui_assign_project')}
      >
        <Folder className="h-4 w-4 flex-shrink-0" />
        <span className="max-w-[120px] truncate">{currentProject?.name ?? localize('com_ui_general')}</span>
        <ChevronDown className="h-4 w-4 flex-shrink-0" />
      </button>
      {dropdownMenu}
    </div>
  );
}
